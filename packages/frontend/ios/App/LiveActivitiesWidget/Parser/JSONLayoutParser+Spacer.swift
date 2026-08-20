import SwiftUI

@available(iOS 16.2, *)
extension JSONLayoutParser {
    static func buildSpacerView(_ element: LayoutElement, _ data: [String: AnyCodable]) -> some View {
       
        // Parse spacer properties
        let minLength = getDouble(from: resolveValue(element.properties["minLength"], with: data))
                
        return AnyView(
            Group {
                if let minLength = minLength {
                    Spacer(minLength: CGFloat(minLength))
                } else {
                    Spacer()
                }
            }
        )
    }
}
