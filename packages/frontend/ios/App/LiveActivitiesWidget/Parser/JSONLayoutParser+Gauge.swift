import SwiftUI
import OSLog

@available(iOS 16.2, *)
extension JSONLayoutParser {
    
    static func buildGaugeView(_ element: LayoutElement, _ data: [String: AnyCodable]) -> some View {
        let logger = Logger(subsystem: "com.liveactivities.parser", category: "Gauge")
        logger.debug("Building gauge view")
        
        // Parse gauge properties
        let valueAny = resolveValue(element.properties["value"], with: data)
        let minValue = getDouble(from: resolveValue(element.properties["minValue"], with: data)) ?? 0
        let maxValue = getDouble(from: resolveValue(element.properties["maxValue"], with: data)) ?? 100
        let startAngle = getDouble(from: resolveValue(element.properties["startAngle"], with: data)) ?? 0
        let endAngle = getDouble(from: resolveValue(element.properties["endAngle"], with: data)) ?? 360
        let strokeWidth = getDouble(from: resolveValue(element.properties["strokeWidth"], with: data)) ?? 4
        let foregroundColorString = getString(from: resolveValue(element.properties["foregroundColor"], with: data))
        let backgroundColorString = getString(from: resolveValue(element.properties["backgroundColor"], with: data))
        let showsCurrentValueLabel = getBool(from: resolveValue(element.properties["showsCurrentValueLabel"], with: data)) ?? false
        
        // Parse value (can be number or string)
        let value: Double
        if let doubleValue = getDouble(from: valueAny) {
            value = doubleValue
        } else if let stringValue = getString(from: valueAny), let doubleValue = Double(stringValue) {
            value = doubleValue
        } else {
            logger.error("Could not parse gauge value")
            value = 0
        }
        
        logger.debug("Gauge properties - value: \(value), min: \(minValue), max: \(maxValue), startAngle: \(startAngle), endAngle: \(endAngle), strokeWidth: \(strokeWidth), showLabel: \(showsCurrentValueLabel)")
        
        // Calculate progress (0.0 to 1.0)
        let progress = min(max((value - minValue) / (maxValue - minValue), 0.0), 1.0)
        
        // Colors
        let foregroundColor = foregroundColorString.flatMap { Color(hex: $0) } ?? Color.blue
        let backgroundColor = backgroundColorString.flatMap { Color(hex: $0) } ?? Color.gray.opacity(0.3)
        
        return AnyView(
            ZStack {
                // Background track
                Circle()
                    .stroke(backgroundColor, lineWidth: CGFloat(strokeWidth))
                
                // Progress arc
                Circle()
                    .trim(from: 0, to: CGFloat(progress))
                    .stroke(foregroundColor, style: StrokeStyle(lineWidth: CGFloat(strokeWidth), lineCap: .round))
                    .rotationEffect(.degrees(startAngle - 90)) // Adjust rotation to start from top
                
                // Optional center label
                if showsCurrentValueLabel {
                    VStack(spacing: 2) {
                        Text("\(Int(value))")
                            .font(.headline)
                            .fontWeight(.semibold)
                        Text("/ \(Int(maxValue))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .frame(width: 60, height: 60) // Default size
        )
    }
}