import SwiftUI
import OSLog

@available(iOS 16.2, *)
extension JSONLayoutParser {
    struct ViewModifierText: ViewModifier {
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            content
                .modifier(TextModifier(element: element, data: data))
        }
    }
    
    static func buildTextView(_ element: LayoutElement, _ data: [String: AnyCodable]) -> AnyView {
        let text = getString(from: resolveValue(element.properties["text"], with: data)) ?? ""
        
        
        
        return AnyView(Text(text).modifier(ViewModifierText(element: element, data: data)))
    }
    
    struct TextModifier: ViewModifier {
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            let fontSize = getDouble(from: resolveValue(element.properties["fontSize"], with: data)) ?? 0
            let fontWeight = getString(from: resolveValue(element.properties["fontWeight"], with: data)) ?? ""
            let color = getString(from: resolveValue(element.properties["color"], with: data)) ?? ""
            let alignment = getString(from: resolveValue(element.properties["alignment"], with: data)) ?? ""
            let lineLimit = getInt(from: resolveValue(element.properties["lineLimit"], with: data)) ?? 0
            let fontFamily = getString(from: resolveValue(element.properties["fontFamily"], with: data)) ?? ""
            let monospacedDigit = resolveValue(element.properties["monospacedDigit"], with: data) as? Bool ?? false
            
            let weights: [String: Font.Weight] = [
                "bold": .bold,
                "semibold": .semibold,
                "medium": .medium,
                "light": .light,
                "thin": .thin,
                "heavy": .heavy,
                "black": .black,
            ]
            
            let nativeFonts: [String: Font] = [
                "caption": .caption,
                "title": .title,
                "headline": .headline,
                "body": .body,
                "callout": .caption,
                "caption2": .caption2,
                "footnote": .footnote,
                "largeTitle": .largeTitle,
                "subheadline": .subheadline,
                "title2": .title2,
                "title3": .title3
            ]
            
            let alignments: [String: TextAlignment] = [
                "center": .center,
                "leading": .leading,
                "trailing": .trailing
            ]
            
            let textView = content
                .if(fontSize != 0){ view in
                    view.font(.system(size: CGFloat(fontSize)))
                }
                .ifLet(weights[fontWeight]){ view, val in
                    view.fontWeight(val)
                }
                .if(color != ""){
                    obj in obj.foregroundColor(Color(hex: color))
                }
                .ifLet(nativeFonts[fontFamily]){ view, val in
                    view.font(val)
                }
                .ifLet(alignments[alignment]){ view, val in
                    view.multilineTextAlignment(val)
                }
                .if(lineLimit > 0){ view in
                    view.lineLimit(lineLimit)
                }
                .if(monospacedDigit == true){ view in
                    view.monospacedDigit()
                }
            
            Logger.viewCycle.error("📀 buildTextView -> fontSize: \(fontSize), fontWeight: \(fontWeight), color: \(color), fontFamily: \(fontFamily), alignment: \(alignment), lineLimit: \(lineLimit), monospacedDigit: \(monospacedDigit)")
            
            return textView
        }
    }
}
