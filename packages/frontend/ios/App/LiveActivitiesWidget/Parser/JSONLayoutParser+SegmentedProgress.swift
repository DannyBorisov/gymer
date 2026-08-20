import SwiftUI
import OSLog

@available(iOS 16.2, *)
extension JSONLayoutParser {
    struct ViewModifierSegmentedProgress: ViewModifier {
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            content
                .modifier(SegmentedProgressModifier(element: element, data: data))
        }
    }
    
    static func buildSegmentedProgressView(_ element: LayoutElement, _ data: [String: AnyCodable]) -> AnyView {
        return AnyView(
            EmptyView()
                .modifier(ViewModifierSegmentedProgress(element: element, data: data))
        )
    }
    
    struct SegmentedProgressModifier: ViewModifier {
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            let segments = getInt(from: resolveValue(element.properties["segments"], with: data)) ?? 5
            let filled = getInt(from: resolveValue(element.properties["filled"], with: data)) ?? 0
            let spacing = getDouble(from: resolveValue(element.properties["spacing"], with: data)) ?? 4
            let height = getDouble(from: resolveValue(element.properties["height"], with: data)) ?? 6
            let cornerRadius = getDouble(from: resolveValue(element.properties["cornerRadius"], with: data)) ?? 3
            
            // Colors
            let filledColor = getString(from: resolveValue(element.properties["filledColor"], with: data)) ?? "#007AFF"
            let unfilledColor = getString(from: resolveValue(element.properties["unfilledColor"], with: data)) ?? "#E5E5E7"
            let strokeColor = getString(from: resolveValue(element.properties["strokeColor"], with: data)) ?? "#C7C7CC"
            let strokeDashed = resolveValue(element.properties["strokeDashed"], with: data) as? Bool ?? false
            let strokeWidth = getDouble(from: resolveValue(element.properties["strokeWidth"], with: data)) ?? 1
            
            Logger.viewCycle.error("📀 buildSegmentedProgressView -> segments: \(segments), filled: \(filled), spacing: \(spacing), height: \(height), cornerRadius: \(cornerRadius), filledColor: \(filledColor), unfilledColor: \(unfilledColor), strokeColor: \(strokeColor), strokeDashed: \(strokeDashed), strokeWidth: \(strokeWidth)")
            
            let segmentedProgressView = HStack(spacing: CGFloat(spacing)) {
                ForEach(0..<segments, id: \.self) { index in
                    if index < filled {
                        // Filled segment
                        RoundedRectangle(cornerRadius: CGFloat(cornerRadius))
                            .fill(Color(hex: filledColor))
                            .frame(height: CGFloat(height))
                    } else {
                        // Unfilled segment
                        if strokeDashed {
                            RoundedRectangle(cornerRadius: CGFloat(cornerRadius))
                                .stroke(
                                    Color(hex: strokeColor),
                                    style: StrokeStyle(
                                        lineWidth: CGFloat(strokeWidth),
                                        dash: [5]
                                    )
                                )
                                .frame(height: CGFloat(height))
                        } else {
                            RoundedRectangle(cornerRadius: CGFloat(cornerRadius))
                                .fill(Color(hex: unfilledColor))
                                .frame(height: CGFloat(height))
                        }
                    }
                }
            }
            
            return segmentedProgressView
        }
    }
}