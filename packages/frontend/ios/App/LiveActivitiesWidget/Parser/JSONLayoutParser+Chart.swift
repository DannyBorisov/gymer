import SwiftUI
import OSLog

@available(iOS 16.2, *)
extension JSONLayoutParser {
    struct ViewModifierChart: ViewModifier {
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            content
                .modifier(ChartModifier(element: element, data: data))
        }
    }
    
    static func buildChartView(_ element: LayoutElement, _ data: [String: AnyCodable]) -> AnyView {
        return AnyView(
            EmptyView()
                .modifier(ViewModifierChart(element: element, data: data))
        )
    }
    
    struct ChartModifier: ViewModifier {
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            let chartData = getChartData(from: resolveValue(element.properties["data"], with: data))
            let chartType = getString(from: resolveValue(element.properties["type"], with: data)) ?? "line"
            let width = getDouble(from: resolveValue(element.properties["width"], with: data)) ?? 200
            let height = getDouble(from: resolveValue(element.properties["height"], with: data)) ?? 60
            let color = getString(from: resolveValue(element.properties["color"], with: data)) ?? "#007AFF"
            let fillColor = getString(from: resolveValue(element.properties["fillColor"], with: data)) ?? "#007AFF"
            let strokeWidth = getDouble(from: resolveValue(element.properties["strokeWidth"], with: data)) ?? 2
            let showPoints = resolveValue(element.properties["showPoints"], with: data) as? Bool ?? false
            let smooth = resolveValue(element.properties["smooth"], with: data) as? Bool ?? true
            let maxValue = getDouble(from: resolveValue(element.properties["maxValue"], with: data))
            
            Logger.viewCycle.error("📀 buildChartView -> type: \(chartType), data: \(chartData), width: \(width), height: \(height), color: \(color), fillColor: \(fillColor), strokeWidth: \(strokeWidth), showPoints: \(showPoints), smooth: \(smooth), maxValue: \(maxValue?.formatted() ?? "auto")")
            
            let chartView = buildChart(
                data: chartData,
                type: chartType,
                width: CGFloat(width),
                height: CGFloat(height),
                color: Color(hex: color),
                fillColor: Color(hex: fillColor),
                strokeWidth: CGFloat(strokeWidth),
                showPoints: showPoints,
                smooth: smooth,
                maxValue: maxValue
            )
            
            return chartView
        }
        
        private func getChartData(from value: Any?) -> [Double] {
            if let array = value as? [Any] {
                return array.compactMap { item in
                    if let double = item as? Double {
                        return double
                    } else if let int = item as? Int {
                        return Double(int)
                    } else if let string = item as? String, let double = Double(string) {
                        return double
                    } else if let anyCodable = item as? AnyCodable {
                        return getDouble(from: anyCodable.value)
                    }
                    return nil
                }
            } else if let string = value as? String {
                // Try to parse comma-separated values: "10,25,15,30,20"
                let components = string.components(separatedBy: ",")
                return components.compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
            }
            return []
        }
        
        private func buildChart(
            data: [Double],
            type: String,
            width: CGFloat,
            height: CGFloat,
            color: Color,
            fillColor: Color,
            strokeWidth: CGFloat,
            showPoints: Bool,
            smooth: Bool,
            maxValue: Double?
        ) -> some View {
            guard !data.isEmpty else {
                return AnyView(
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: width, height: height)
                        .overlay(
                            Text("No Data")
                                .font(.caption2)
                                .foregroundColor(.gray)
                        )
                )
            }
            
            let maxVal = maxValue ?? data.max() ?? 1.0
            let minVal = data.min() ?? 0.0
            let range = maxVal - minVal
            let normalizedData = data.map { range == 0 ? 0.5 : ($0 - minVal) / range }
            
            switch type {
            case "bar":
                return AnyView(buildBarChart(
                    data: normalizedData,
                    width: width,
                    height: height,
                    color: color
                ))
            case "area":
                return AnyView(buildAreaChart(
                    data: normalizedData,
                    width: width,
                    height: height,
                    color: color,
                    fillColor: fillColor,
                    strokeWidth: strokeWidth,
                    smooth: smooth
                ))
            default: // "line"
                return AnyView(buildLineChart(
                    data: normalizedData,
                    width: width,
                    height: height,
                    color: color,
                    strokeWidth: strokeWidth,
                    showPoints: showPoints,
                    smooth: smooth
                ))
            }
        }
        
        private func buildLineChart(
            data: [Double],
            width: CGFloat,
            height: CGFloat,
            color: Color,
            strokeWidth: CGFloat,
            showPoints: Bool,
            smooth: Bool
        ) -> some View {
            ZStack {
                // Line
                Path { path in
                    let stepX = width / CGFloat(max(1, data.count - 1))
                    
                    for (index, value) in data.enumerated() {
                        let x = CGFloat(index) * stepX
                        let y = height - (CGFloat(value) * height)
                        
                        if index == 0 {
                            path.move(to: CGPoint(x: x, y: y))
                        } else {
                            if smooth && index > 0 {
                                // Simple smooth curve using quadratic bezier
                                let prevX = CGFloat(index - 1) * stepX
                                let prevY = height - (CGFloat(data[index - 1]) * height)
                                let midX = (prevX + x) / 2
                                
                                path.addQuadCurve(
                                    to: CGPoint(x: x, y: y),
                                    control: CGPoint(x: midX, y: prevY)
                                )
                            } else {
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }
                    }
                }
                .stroke(color, style: StrokeStyle(lineWidth: strokeWidth, lineCap: .round, lineJoin: .round))
                
                // Points
                if showPoints {
                    ForEach(Array(data.enumerated()), id: \.offset) { index, value in
                        let stepX = width / CGFloat(max(1, data.count - 1))
                        let x = CGFloat(index) * stepX
                        let y = height - (CGFloat(value) * height)
                        
                        Circle()
                            .fill(color)
                            .frame(width: strokeWidth * 2, height: strokeWidth * 2)
                            .position(x: x, y: y)
                    }
                }
            }
            .frame(width: width, height: height)
        }
        
        private func buildBarChart(
            data: [Double],
            width: CGFloat,
            height: CGFloat,
            color: Color
        ) -> some View {
            HStack(alignment: .bottom, spacing: 2) {
                ForEach(Array(data.enumerated()), id: \.offset) { index, value in
                    let barWidth = (width - CGFloat(data.count - 1) * 2) / CGFloat(data.count)
                    let barHeight = CGFloat(value) * height
                    
                    RoundedRectangle(cornerRadius: barWidth / 4)
                        .fill(color)
                        .frame(width: barWidth, height: max(2, barHeight))
                }
            }
            .frame(width: width, height: height)
        }
        
        private func buildAreaChart(
            data: [Double],
            width: CGFloat,
            height: CGFloat,
            color: Color,
            fillColor: Color,
            strokeWidth: CGFloat,
            smooth: Bool
        ) -> some View {
            ZStack {
                // Fill area
                Path { path in
                    let stepX = width / CGFloat(max(1, data.count - 1))
                    
                    // Start from bottom left
                    path.move(to: CGPoint(x: 0, y: height))
                    
                    // Draw the data line
                    for (index, value) in data.enumerated() {
                        let x = CGFloat(index) * stepX
                        let y = height - (CGFloat(value) * height)
                        
                        if index == 0 {
                            path.addLine(to: CGPoint(x: x, y: y))
                        } else {
                            if smooth && index > 0 {
                                let prevX = CGFloat(index - 1) * stepX
                                let prevY = height - (CGFloat(data[index - 1]) * height)
                                let midX = (prevX + x) / 2
                                
                                path.addQuadCurve(
                                    to: CGPoint(x: x, y: y),
                                    control: CGPoint(x: midX, y: prevY)
                                )
                            } else {
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }
                    }
                    
                    // Close the area by going to bottom right and back to start
                    path.addLine(to: CGPoint(x: width, y: height))
                    path.closeSubpath()
                }
                .fill(fillColor.opacity(0.3))
                
                // Stroke line
                Path { path in
                    let stepX = width / CGFloat(max(1, data.count - 1))
                    
                    for (index, value) in data.enumerated() {
                        let x = CGFloat(index) * stepX
                        let y = height - (CGFloat(value) * height)
                        
                        if index == 0 {
                            path.move(to: CGPoint(x: x, y: y))
                        } else {
                            if smooth && index > 0 {
                                let prevX = CGFloat(index - 1) * stepX
                                let prevY = height - (CGFloat(data[index - 1]) * height)
                                let midX = (prevX + x) / 2
                                
                                path.addQuadCurve(
                                    to: CGPoint(x: x, y: y),
                                    control: CGPoint(x: midX, y: prevY)
                                )
                            } else {
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }
                    }
                }
                .stroke(color, style: StrokeStyle(lineWidth: strokeWidth, lineCap: .round, lineJoin: .round))
            }
            .frame(width: width, height: height)
        }
    }
}