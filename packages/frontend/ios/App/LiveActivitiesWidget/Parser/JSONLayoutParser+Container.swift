import SwiftUI
import OSLog

extension JSONLayoutParser {
    @available(iOS 16.2, *)
    static func buildContainerView(_ element: LayoutElement, _ data: [String: AnyCodable]) -> AnyView {
        let direction = getString(from: resolveValue(element.properties["direction"], with: data)) ?? ""
        
        let spacing = getDouble(from: resolveValue(element.properties["spacing"], with: data))
        
        let insideAlignment = getString(from: resolveValue(element.properties["insideAlignment"], with: data)) ?? ""
        
        let children = element.children ?? []
        // let children = [] as [LayoutElement]
        
        Logger.viewCycle.error("📀 buildContainer -> direction: \(direction), spacing: \(spacing ?? 0), insideAlignment: \(insideAlignment), childrens: \(children.count)")
        
        switch direction.lowercased() {
        case "horizontal":
            let hAlignment: VerticalAlignment = {
                switch insideAlignment {
                case "center": return .center
                case "top": return .top
                case "bottom": return .bottom
                case "first-text-baseline": return .firstTextBaseline
                case "last-text-baseline": return .lastTextBaseline
                default: return .center
                }
            }()
            
            return AnyView(
                HStack(alignment: hAlignment, spacing: spacing != nil ? CGFloat(spacing!) : nil) {
                    ForEach(children.indices, id: \.self) { index in
                        buildView(from: children[index], with: data)
                    }
                }
            )
            
        case "stack":
            let zAlignment: Alignment = {
                switch insideAlignment {
                case "top": return .top
                case "top-leading", "top-left": return .topLeading
                case "top-trailing", "top-right":  return .topTrailing
                case "bottom":  return .bottom
                case "bottom-leading", "bottom-left":  return .bottomLeading
                case "bottom-trailing", "bottom-right":  return .bottomTrailing
                case "center":  return .center
                case "center-first-text-baseline":  return .centerFirstTextBaseline
                case "center-last-text-baseline":  return .centerLastTextBaseline
                case "leading", "left":  return .leading
                case "leading-first-text-baseline", "left-first-text-baseline":  return .leadingFirstTextBaseline
                case "leading-last-text-baseline", "left-last-text-baseline":  return .leadingLastTextBaseline
                case "trailing", "right":  return .trailing
                case "trailing-first-text-baseline", "right-first-text-baseline":  return .trailingFirstTextBaseline
                case "trailing-last-text-baseline", "right-last-text-baseline": return .trailingLastTextBaseline
                default: return .center
                }
            }()
            
            return AnyView(
                ZStack(alignment: zAlignment) {
                    ForEach(children.indices, id: \.self) { index in
                        buildView(from: children[index], with: data)
                    }
                }
            )
            
        default: // vertical
            let vAlignment: HorizontalAlignment = {
                switch insideAlignment {
                case "center": return .center
                case "leading", "left": return .leading
                case "trailing", "right": return .trailing
                case "list-row-separator-trailing", "list-row-separator-right": return .listRowSeparatorTrailing
                case "list-row-separator-leading", "list-row-separator-left": return .listRowSeparatorLeading
                default: return .center
                }
            }()
            
            return AnyView(
                VStack(alignment: vAlignment, spacing: spacing != nil ? CGFloat(spacing!) : nil) {
                    ForEach(children.indices, id: \.self) { index in
                        buildView(from: children[index], with: data)
                    }
                }
            )
        }
    }
}
