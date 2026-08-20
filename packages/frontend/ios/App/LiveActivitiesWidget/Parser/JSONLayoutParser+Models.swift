import SwiftUI

// Structure for Dynamic Island Layout Data (Codable version of LayoutElement)
@available(iOS 16.2, *)
struct LayoutElementData: Codable {
    let type: String
    let properties: [[String: AnyCodable]]?
    let children: [LayoutElementData]?
    
    func toLayoutElement() -> LayoutElement {
        var propertiesKeysInOrder: [String] = []
        var propertiesDict: [String: AnyCodable] = [:]
        
        if let props = properties {
            props.forEach { item in
                if let firstPair = item.first {
                    propertiesKeysInOrder.append(firstPair.key)
                    propertiesDict[firstPair.key] = firstPair.value
                }
            }
        }
        
        let childElements = children?.map { $0.toLayoutElement() }
        
        return LayoutElement(
            type: type,
            properties: propertiesDict,
            propertiesKeysInOrder: propertiesKeysInOrder,
            children: childElements
        )
    }
}

@available(iOS 16.2, *)
struct DynamicIslandLayoutData: Codable {
    struct ExpandedLayout: Codable {
        let leading: LayoutElementData?
        let trailing: LayoutElementData?
        let center: LayoutElementData?
        let bottom: LayoutElementData?
    }
    
    let expanded: ExpandedLayout?
    let compactLeading: LayoutElementData?
    let compactTrailing: LayoutElementData?
    let minimal: LayoutElementData?
}

@available(iOS 16.2, *)
struct BehaviorLayoutData: Codable {
    let keyLineTint: String?
    let systemActionForegroundColor: String?
    let backgroundTint: String?
    let widgetUrl: String?
}

@available(iOS 16.2, *)
struct LayoutElement {
    let type: String
    let properties: [String: AnyCodable]
    let children: [LayoutElement]?
    let propertiesKeysInOrder: [String]
    
    enum CodingKeys: String, CodingKey {
        case id, type, properties, children
    }
    
    init(
        type: String,
        properties: [String: AnyCodable],
        propertiesKeysInOrder: [String],
        children: [LayoutElement]?
    ) {
        self.type = type
        self.properties = properties
        self.propertiesKeysInOrder = propertiesKeysInOrder
        self.children = children
    }
    
}
        
struct LayoutGradient: Codable {
    let colors: [String]
    let startPoint: String
    let endPoint: String
}

// Extension para converter hex para Color
extension Color {
    init(hex: String) {
        let trimmedString = hex.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        
        // Verifica se é uma cor predefinida primeiro
        switch trimmedString {
        case "primary":
            self = .primary
            return
        case "secondary":
            self = .secondary
            return
        case "accent":
            self = .accentColor
            return
        case "red":
            self = .red
            return
        case "blue":
            self = .blue
            return
        case "green":
            self = .green
            return
        case "yellow":
            self = .yellow
            return
        case "orange":
            self = .orange
            return
        case "purple":
            self = .purple
            return
        case "pink":
            self = .pink
            return
        case "black":
            self = .black
            return
        case "white":
            self = .white
            return
        case "gray", "grey":
            self = .gray
            return
        case "clear":
            self = .clear
            return
        default:
            break // Continua para processamento hex
        }
        
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

public enum ImageSource {
    case systemName(String)
    case url(String)
    case appGroup(String)
    case asset(String)
    case base64(String)
}

class ImageCache {
    static let shared = ImageCache()
    private let cache = NSCache<NSString, UIImage>()
    
    private init() {
        cache.countLimit = 50 // Máximo de 50 imagens
        cache.totalCostLimit = 50 * 1024 * 1024 // 50MB
    }
    
    func setImage(_ image: UIImage, forKey key: String) {
        cache.setObject(image, forKey: key as NSString)
    }
    
    func getImage(forKey key: String) -> UIImage? {
        return cache.object(forKey: key as NSString)
    }
}
