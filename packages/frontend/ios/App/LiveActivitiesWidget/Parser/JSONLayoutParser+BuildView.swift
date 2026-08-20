import OSLog
import SwiftUI

@available(iOS 16.2, *)
extension JSONLayoutParser {
    // ViewModifierChain para aplicar modificadores sem cascatear AnyView
    struct ViewModifierChain: ViewModifier {
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            content
                .modifier(FrameModifier(element: element, data: data))
                .modifier(PaddingModifier(element: element, data: data))
                .modifier(OffsetModifier(element: element, data: data))
                .modifier(AppearanceModifier(element: element, data: data))
                .modifier(TransformModifier(element: element, data: data))
                .modifier(StyleModifier(element: element, data: data))
        }
    }
    
    // Modificadores individuais
    struct FrameModifier: ViewModifier{
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            let width = getDouble(from: resolveValue(element.properties["width"], with: data))
            let height = getDouble(from: resolveValue(element.properties["height"], with: data))
            
            let idealWidth = getDouble(from: resolveValue(element.properties["idealWidth"], with: data))
            let idealHeight = getDouble(from: resolveValue(element.properties["idealHeight"], with: data))
            let maxWidth = getDouble(from: resolveValue(element.properties["maxWidth"], with: data))
            let maxHeight = getDouble(from: resolveValue(element.properties["maxHeight"], with: data))
            let minWidth = getDouble(from: resolveValue(element.properties["minWidth"], with: data))
            let minHeight = getDouble(from: resolveValue(element.properties["minHeight"], with: data))
            let alignment = getString(from: resolveValue(element.properties["alignment"], with: data))
            
            
            Logger.viewCycle.error("📀 frameModifier -> width: \(width?.formatted() ?? "nil"), height: \(height?.formatted() ?? "nil"), minWidth: \(minWidth?.formatted() ?? "nil"), idealWidth: \(idealWidth?.formatted() ?? "nil"), maxWidth: \(maxWidth?.formatted() ?? "nil"), minHeight: \(minHeight?.formatted() ?? "nil"), idealHeight: \(idealHeight?.formatted() ?? "nil"), maxHeight: \(maxHeight?.formatted() ?? "nil"), alignment: \(alignment ?? "nil")")
            
            let zAlignment: Alignment = {
                switch alignment {
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
            
            
            if alignment != nil && width == nil && height == nil && minWidth == nil && idealWidth == nil && maxWidth == nil && minHeight == nil && idealHeight == nil && maxHeight == nil {
                Logger.viewCycle.error("📀 frameModifier -> Applied alignment: \(alignment ?? "nil")")
                return AnyView(content.frame(alignment: zAlignment))
            }
            
            if width != nil || height != nil {
                Logger.viewCycle.error("📀 frameModifier -> Applied Width & Height: \(width?.formatted() ?? "nil"), \(height?.formatted() ?? "nil")")
                return AnyView(content.frame(
                    width: width == nil ? nil : CGFloat(width!),
                    height: height == nil ? nil : CGFloat(height!),
                    alignment: zAlignment
                ))
            }
            
            if minWidth != nil || idealWidth != nil || maxWidth != nil || minHeight != nil || idealHeight != nil || maxHeight != nil {
                Logger.viewCycle.error("📀 frameModifier -> Applied All")
                return AnyView(content
                    .frame(
                        minWidth: minWidth == nil ? nil : minWidth.map { $0 == -1 ? .infinity : CGFloat($0) },
                        idealWidth: idealWidth == nil ? nil : idealWidth.map { $0 == -1 ? .infinity : CGFloat($0) },
                        maxWidth: maxWidth == nil ? nil : maxWidth.map { $0 == -1 ? .infinity : CGFloat($0) },
                        minHeight: minHeight == nil ? nil : minHeight.map { $0 == -1 ? .infinity : CGFloat($0) },
                        idealHeight: idealHeight == nil ? nil : idealHeight.map { $0 == -1 ? .infinity : CGFloat($0) },
                        maxHeight: maxHeight == nil ? nil : maxHeight.map { $0 == -1 ? .infinity : CGFloat($0) },
                        alignment: zAlignment
                    ))
            }
            
            return AnyView(content)
        }
    }
    
    struct PaddingModifier: ViewModifier {
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            var output: AnyView = AnyView(content)
            
            if let paddingValue = element.properties["padding"] {
                if let boolValue = paddingValue.value as? Bool, boolValue == true {
                    Logger.viewCycle.error("📀 paddingModifier -> padding -> true")
                    output = AnyView(output.padding())
                } else if let padding = getDouble(from: resolveValue(paddingValue, with: data)) {
                    Logger.viewCycle.error("📀 paddingModifier -> padding -> \(padding)")
                    output = AnyView(output.padding(CGFloat(padding)))
                }
            }
            
            if let paddingHValue = element.properties["paddingHorizontal"] {
                if let boolValue = paddingHValue.value as? Bool, boolValue == true {
                    Logger.viewCycle.error("📀 paddingModifier -> paddingHorizontal -> true")
                    output = AnyView(output.padding(.horizontal))
                } else if let padding = getDouble(from: resolveValue(paddingHValue, with: data)) {
                    Logger.viewCycle.error("📀 paddingModifier -> paddingHorizontal -> \(padding)")
                    output = AnyView(output.padding(.horizontal, CGFloat(padding)))
                    Logger.viewCycle.error("! paddingHorizontal \(padding)")
                }
            }
            
            if let paddingVValue = element.properties["paddingVertical"] {
                if let boolValue = paddingVValue.value as? Bool, boolValue == true {
                    Logger.viewCycle.error("📀 paddingModifier -> paddingVertical -> true")
                    output = AnyView(output.padding(.vertical))
                } else if let padding = getDouble(from: resolveValue(paddingVValue, with: data)) {
                    Logger.viewCycle.error("📀 paddingModifier -> paddingVertical -> \(padding)")
                    output = AnyView(output.padding(.vertical, CGFloat(padding)))
                    Logger.viewCycle.error("! paddingVertical \(padding)")
                }
            }
            
            return output
        }
    }
    
    struct OffsetModifier: ViewModifier {
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            if let offsetValue = element.properties["offset"],
               let offsetDict = offsetValue.value as? [String: Any] {
                let x = getDouble(from: offsetDict["x"]) ?? 0
                let y = getDouble(from: offsetDict["y"]) ?? 0
                Logger.viewCycle.error("📀 offsetModifier -> offset -> x: \(x), y: \(y)")
                return AnyView(content.offset(x: CGFloat(x), y: CGFloat(y)))
            }
            return AnyView(content)
        }
    }
    
    struct AppearanceModifier: ViewModifier {
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            var modifiedContent = AnyView(content)
            
            // Opacity
            if let opacityValue = element.properties["opacity"],
               let opacity = getDouble(from: resolveValue(opacityValue, with: data)) {
                Logger.viewCycle.error("📀 appearanceModifier -> opacity -> \(opacity)")
                modifiedContent = AnyView(modifiedContent.opacity(opacity))
            }
            
            // Z-Index
            if let zIndexValue = element.properties["zIndex"],
               let zIndex = getDouble(from: resolveValue(zIndexValue, with: data)) {
                Logger.viewCycle.error("📀 appearanceModifier -> zIndex -> \(zIndex)")
                modifiedContent = AnyView(modifiedContent.zIndex(zIndex))
            }
            
            // Corner Radius
            if let radiusValue = element.properties["cornerRadius"],
               let radius = getDouble(from: resolveValue(radiusValue, with: data)) {
                Logger.viewCycle.error("📀 appearanceModifier -> cornerRadius -> \(radius)")
                modifiedContent = AnyView(modifiedContent.cornerRadius(CGFloat(radius)))
            }
            
            // Shadow
            if let shadowValue = element.properties["shadow"],
               let shadowDict = shadowValue.value as? [String: Any] {
                let color = getString(from: shadowDict["color"]) ?? "#000000"
                let radius = getDouble(from: shadowDict["radius"]) ?? 5
                let x = getDouble(from: shadowDict["x"]) ?? 0
                let y = getDouble(from: shadowDict["y"]) ?? 2
                
                Logger.viewCycle.error(
                    "📀 appearanceModifier -> shadow -> color \(color), radius \(radius), x \(x), y \(y)")
                
                modifiedContent = AnyView(
                    modifiedContent.shadow(
                        color: Color(hex: color).opacity(0.3),
                        radius: CGFloat(radius),
                        x: CGFloat(x),
                        y: CGFloat(y)
                    )
                )
            }
            
            return modifiedContent
        }
    }
    
    struct TransformModifier: ViewModifier {
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            var modifiedContent = AnyView(content)
            
            // Rotation
            if let rotationValue = element.properties["rotation"],
               let rotation = getDouble(from: resolveValue(rotationValue, with: data)) {
                Logger.viewCycle.error("📀 transformModifier -> rotation -> \(rotation)")
                modifiedContent = AnyView(modifiedContent.rotationEffect(.degrees(rotation)))
            }
            
            // Scale
            if let scaleValue = element.properties["scale"],
               let scale = getDouble(from: resolveValue(scaleValue, with: data)) {
                Logger.viewCycle.error("📀 transformModifier -> scale -> \(scale)")
                modifiedContent = AnyView(modifiedContent.scaleEffect(CGFloat(scale)))
            }
            
            if
                let textAlignment = getString(from: resolveValue(element.properties["multilineTextAlignment"], with: data)){
                let translatedAlignment: TextAlignment = {
                    switch textAlignment {
                    case "center": return .center
                    case "leading", "left": return .leading
                    case "trailing", "right": return .trailing
                    default: return .center
                    }
                }()
                Logger.viewCycle.error("📀 transformModifier -> multilineTextAlignment -> \(textAlignment)")
                modifiedContent = AnyView(modifiedContent.multilineTextAlignment(translatedAlignment))
            }
            
            return modifiedContent
        }
    }
    
    struct StyleModifier: ViewModifier {
        let element: LayoutElement
        let data: [String: AnyCodable]
        
        func body(content: Content) -> some View {
            var modifiedContent = AnyView(content)
            
            // Foreground Style
            if let fgValue = element.properties["foregroundColor"],
               let fgColor = getString(from: resolveValue(fgValue, with: data)) {
                Logger.viewCycle.error("📀 styleModifier -> foregroundStyle -> \(fgColor)")
                modifiedContent = AnyView(modifiedContent.foregroundStyle(.white))
            }
            
            // Background Color
            if let bgValue = element.properties["backgroundColor"],
               let bgColor = getString(from: resolveValue(bgValue, with: data)) {
                Logger.viewCycle.error("📀 styleModifier -> backgroundColor -> \(bgColor)")
                modifiedContent = AnyView(modifiedContent.background(Color(hex: bgColor)))
            }
            
            // Gradient
            if let gradientValue = element.properties["backgroundGradient"],
               let gradientDict = gradientValue.value as? [String: Any],
               let colors = gradientDict["colors"] as? [String] {
                
                let startPoint = getGradientPoint(from: getString(from: gradientDict["startPoint"])) ?? .bottomLeading
                let endPoint = getGradientPoint(from: getString(from: gradientDict["endPoint"])) ?? .topTrailing
                
                Logger.viewCycle.error("📀 styleModifier -> backgroundGradient -> \(colors) -> \(gradientDict["startPoint"] as! String) -> \(gradientDict["endPoint"] as! String)")
                
                let gradient = LinearGradient(
                    gradient: Gradient(colors: colors.map { Color(hex: $0) }),
                    startPoint: startPoint,
                    endPoint: endPoint
                )
                
                
                modifiedContent = AnyView(modifiedContent.background(gradient))
            }
            
            if let capsuleValue = element.properties["backgroundCapsule"],
               let capsuleDict = capsuleValue.value as? [String: Any],
               let foregroundColor = capsuleDict["foregroundColor"] as? String {
                
                Logger.viewCycle.error("📀 styleModifier -> backgroundCapsule -> \(foregroundColor)")
                                
                let capsule = Capsule().foregroundColor(Color(hex: foregroundColor))
                
                modifiedContent = AnyView(modifiedContent.background(capsule))
            }
            
            return modifiedContent
        }
    }
    
    static func buildView(
        from element: LayoutElement, with data: [String: AnyCodable]
    ) -> AnyView {
        Logger.viewCycle.error(
            "📀 BuildView -> \(element.type) - \(element.propertiesKeysInOrder)")
        
        // Build da view baseado no tipo
        switch element.type {
        case "text":
            return AnyView(
                buildTextView(element, data)
                    .modifier(ViewModifierChain(element: element, data: data))
            )
        case "image":
            return AnyView(
                buildImageView(element, data)
                    .modifier(ViewModifierChain(element: element, data: data))
            )
        case "progress":
            return AnyView(
                buildProgressView(element, data)
                    .modifier(ViewModifierChain(element: element, data: data))
            )
        case "timer":
            return AnyView(
                buildTimerView(element, data)
                    .modifier(ViewModifierChain(element: element, data: data))
            )
        case "segmented-progress":
            return AnyView(
                buildSegmentedProgressView(element, data)
                    .modifier(ViewModifierChain(element: element, data: data))
            )
        case "chart":
            return AnyView(
                buildChartView(element, data)
                    .modifier(ViewModifierChain(element: element, data: data))
            )
        case "container":
            return AnyView(
                buildContainerView(element, data)
                    .modifier(ViewModifierChain(element: element, data: data))
            )
        case "spacer":
            return AnyView(
                buildSpacerView(element, data)
                    .modifier(ViewModifierChain(element: element, data: data))
            )
        case "gauge":
            return AnyView(
                buildGaugeView(element, data)
                    .modifier(ViewModifierChain(element: element, data: data))
            )
        default:
            return AnyView(
                EmptyView()
                    .modifier(ViewModifierChain(element: element, data: data))
            )
        }
    }
    
}
