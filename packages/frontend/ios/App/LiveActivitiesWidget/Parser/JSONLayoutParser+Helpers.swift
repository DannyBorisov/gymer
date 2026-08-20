import SwiftUI
import WidgetKit
import OSLog
import Compression

@available(iOS 16.2, *)
extension JSONLayoutParser {
    public static func parseJsonCompressedIfNeeded<T: Decodable>(from json: String, as type: T.Type) -> T? {
        var actualJson = json
        
        // Check if behavior is compressed and decompress it
        if json.hasPrefix("__COMPRESSED__:") {
            let compressedBase64 = String(json.dropFirst("__COMPRESSED__:".count))
            if let decompressedBehavior = decompressLayoutJSON(compressedBase64) {
                actualJson = decompressedBehavior
                print("✅ Widget: Decompressed successfully")
            } else {
                print("❌ Widget: Decompression failed")
                return nil
            }
        }
        
        guard let jsonData = actualJson.data(using: .utf8),
              let decoded = try? JSONDecoder().decode(type, from: jsonData) else {
            print("❌ Widget: Failed to decode JSON")
            return nil
        }
        
        return decoded
    }
    
    static func getDouble(from value: Any?) -> Double? {
        switch value {
        case let double as Double:
            return double
        case let int as Int:
            return Double(int)
        case let float as Float:
            return Double(float)
        case let string as String:
            return Double(string)
        case let anyCodable as AnyCodable:
            return getDouble(from: anyCodable.value)
        default:
            return nil
        }
    }
    
    static func getInt(from value: Any?) -> Int? {
        switch value {
        case let int as Int:
            return int
        case let double as Double:
            return Int(double)
        case let float as Float:
            return Int(float)
        case let string as String:
            return Int(string)
        case let anyCodable as AnyCodable:
            return getInt(from: anyCodable.value)
        default:
            return nil
        }
    }
    
    static func getString(from value: Any?) -> String? {
        switch value {
        case let string as String:
            return string
        case let anyCodable as AnyCodable:
            return getString(from: anyCodable.value)
        case let number as NSNumber:
            return number.stringValue
        case let int as Int:
            return String(int)
        case let double as Double:
            return String(double)
        case let bool as Bool:
            return String(bool)
        default:
            return nil
        }
    }
    
    static func getBool(from value: Any?) -> Bool? {
        switch value {
        case let bool as Bool:
            return bool
        case let anyCodable as AnyCodable:
            return getBool(from: anyCodable.value)
        case let string as String:
            return Bool(string)
        case let int as Int:
            return int != 0
        case let double as Double:
            return double != 0
        default:
            return nil
        }
    }
    
    static func getGradientPoint(from value: String?) -> UnitPoint? {
        guard let value = value else { return nil }
        switch value {
        case "topLeading":
            return .topLeading
        case "topTrailing":
            return .topTrailing
        case "bottomLeading":
            return .bottomLeading
        case "bottomTrailing":
            return .bottomTrailing
        default:
            return .topLeading
        }
    }
    
    static func resolveValue(_ value: AnyCodable?, with data: [String: AnyCodable]) -> Any? {
        guard let value = value else { return nil }
        
        if let stringValue = value.value as? String,
           stringValue.starts(with: "{{") && stringValue.hasSuffix("}}") {
            let key = String(stringValue.dropFirst(2).dropLast(2)).trimmingCharacters(in: .whitespaces)
            return data[key]?.value
        }
        
        return value.value
    }
    
    static func decompressLayoutJSON(_ base64String: String) -> String? {
        guard let compressedData = Data(base64Encoded: base64String) else { return nil }
        
        let maxDecompressedSize = compressedData.count * 10 // Estimate 10x expansion
        let destinationBuffer = UnsafeMutablePointer<UInt8>.allocate(capacity: maxDecompressedSize)
        defer { destinationBuffer.deallocate() }
        
        let decompressedSize = compression_decode_buffer(
            destinationBuffer, maxDecompressedSize,
            compressedData.withUnsafeBytes { $0.bindMemory(to: UInt8.self).baseAddress! }, compressedData.count,
            nil, COMPRESSION_ZLIB
        )
        
        guard decompressedSize > 0 else { return nil }
        
        let decompressedData = Data(bytes: destinationBuffer, count: decompressedSize)
        return String(data: decompressedData, encoding: .utf8)
    }
}

extension Logger {
    /// Using your bundle identifier is a great way to ensure a unique identifier.
    private static var subsystem = Bundle.main.bundleIdentifier!
    
    /// Logs the view cycles like a view that appeared.
    public static let viewCycle = Logger(subsystem: subsystem, category: "viewcycle")
    
    /// All logs related to tracking and analytics.
    public static let statistics = Logger(subsystem: subsystem, category: "statistics")
}

extension View {
    @ViewBuilder
    func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        }else{
            self
        }
    }
    
    @ViewBuilder
    func ifLet<T, Content: View>(_ value: T?, transform: (Self, T) -> Content) -> some View {
        if let value = value {
            transform(self, value)
        } else {
            self
        }
    }
    
    @ViewBuilder
    func ifLetWhen<T, Content: View>(
        _ value: T?,
        when predicate: (T) -> Bool = { _ in true },
        transform: (Self, T) -> Content
    ) -> some View {
        if let v = value, predicate(v) {
            transform(self, v)
        } else {
            self
        }
    }
}

@available(iOS 16.2, *)
extension DynamicIsland {
    func ifLet<T>(_ value: T?, transform: (DynamicIsland, T) -> DynamicIsland) -> DynamicIsland {
        if let value = value {
            return transform(self, value)
        } else {
            return self
        }
    }
}


enum FontStyle: String, Codable {
    case largeTitle, title, title2, title3
    case headline, subheadline, body, callout
    case footnote, caption, caption2
    
    var defaultSize: CGFloat {
        switch self {
        case .largeTitle: return 34
        case .title: return 28
        case .title2: return 22
        case .title3: return 20
        case .headline: return 17
        case .subheadline: return 15
        case .body: return 17
        case .callout: return 16
        case .footnote: return 13
        case .caption: return 12
        case .caption2: return 11
        }
    }
    
    var defaultWeight: Font.Weight {
        switch self {
        case .headline: return .semibold
        default: return .regular
        }
    }
    
    var defaultDesign: Font.Design {
        return .default
    }
}
