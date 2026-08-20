import SwiftUI
import OSLog

@available(iOS 16.2, *)
extension JSONLayoutParser {
    static func buildProgressView(_ element: LayoutElement, _ data: [String: AnyCodable]) -> AnyView {
        let value = getDouble(from: resolveValue(element.properties["value"], with: data)) ?? 0
        let total = getDouble(from: resolveValue(element.properties["total"], with: data)) ?? 1
        let color = getString(from: resolveValue(element.properties["color"], with: data)) ?? "#007AFF"
        let height = getDouble(from: resolveValue(element.properties["height"], with: data)) ?? 4
        
        Logger.viewCycle.error("📀 buildProgressView -> \(value)/\(total), \(color), \(height)")
        
        return AnyView(
            ProgressView(value: value, total: total)
                .progressViewStyle(LinearProgressViewStyle(tint: Color(hex: color)))
                .frame(height: CGFloat(height))
        )
    }
    
    static func buildTimerView(_ element: LayoutElement, _ data: [String: AnyCodable]) -> AnyView {
        let endTime = getDouble(from: resolveValue(element.properties["endTime"], with: data))
        let style = getString(from: resolveValue(element.properties["style"], with: data))

        if(endTime == nil || style == nil){
            return AnyView(Text("Invalid Timer").foregroundColor(Color.red))
        }

        let startDate = Date(timeIntervalSince1970: endTime! / 1000)

        Logger.viewCycle.error("📀 buildTimerView -> startDate: \(startDate) / style: \(style ?? "-")")

        // For "timer" style, count UP from the start date (elapsed time)
        if(style == "timer"){
            return AnyView(Text(
                timerInterval: startDate...Date.distantFuture,
                pauseTime: nil,
                countsDown: false,
                showsHours: true
            ).modifier(ViewModifierText(element: element, data: data)))
        }

        // For "countdown" style, count DOWN to the end date
        if(style == "countdown"){
            return AnyView(Text(
                timerInterval: Date.now...startDate,
                pauseTime: nil,
                countsDown: true,
                showsHours: false
            ).modifier(ViewModifierText(element: element, data: data)))
        }

        // Other styles use standard date formatting
        let selectedStyle: Text.DateStyle = {
            switch style {
            case "offset": return .offset
            case "relative": return .relative
            case "date": return .date
            case "time": return .time
            default: return .date
            }
        }()

        return AnyView(Text(startDate, style: selectedStyle).modifier(ViewModifierText(element: element, data: data)))
    }
}
