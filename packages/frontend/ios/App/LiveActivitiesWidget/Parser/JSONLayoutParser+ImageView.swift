import SwiftUI
import OSLog

@available(iOS 16.2, *)
extension JSONLayoutParser {
    static func buildImageView(_ element: LayoutElement, _ data: [String: AnyCodable]) -> AnyView {
        let width = getDouble(from: resolveValue(element.properties["width"], with: data)) ?? 0
        let height = getDouble(from: resolveValue(element.properties["height"], with: data)) ?? 0
        let cornerRadius = getDouble(from: resolveValue(element.properties["cornerRadius"], with: data)) ?? 0
        let contentMode = getString(from: resolveValue(element.properties["contentMode"], with: data)) ?? ""
        let resizable = resolveValue(element.properties["resizable"], with: data) as? Bool ?? false
        
        Logger.viewCycle.error("📀 buildImageView -> width: \(width), height: \(height), cornerRadius: \(cornerRadius), contentMode: \(contentMode)")
        
        // Determinar fonte da imagem
        var imageView: AnyView
        
        if let systemName = getString(from: resolveValue(element.properties["systemName"], with: data)) {
            // SF Symbols
            let color = getString(from: resolveValue(element.properties["color"], with: data)) ?? ""
            
            Logger.viewCycle.error("📀 buildImageView -> systemName: \(systemName), color: \(color)")
            
            imageView = AnyView(
                Image(systemName: systemName).if(resizable){ view in
                    view.resizable()
                }
            )
            
            if color != "" {
                imageView = AnyView(
                    imageView.foregroundColor(Color(hex: color))
                )
            }
        } else if let urlString = getString(from: resolveValue(element.properties["url"], with: data)) {
            // Remote URL
            Logger.viewCycle.error("📀 buildImageView -> url: \(urlString)")
            imageView = AnyView(
                AsyncImageView(urlString: urlString, resizable: resizable)
            )
        } else if let fileName = getString(from: resolveValue(element.properties["appGroup"], with: data)) {
            // Image saved to App Group
            Logger.viewCycle.error("📀 buildImageView -> appGroup: \(fileName)")
            imageView = AnyView(
                AppGroupImageView(fileName: fileName, resizable: resizable)
            )
        } else if let assetName = getString(from: resolveValue(element.properties["asset"], with: data)) {
            
            // Asset from bundle
            Logger.viewCycle.error("📀 buildImageView -> asset: \(assetName)")
            imageView = AnyView(
                Image(assetName).if(resizable){ view in
                    view.resizable()
                }
            )
        } else if let base64String = getString(from: resolveValue(element.properties["base64"], with: data)) {
            // Base64
            Logger.viewCycle.error("📀 buildImageView -> base64: \(base64String)")
            imageView = AnyView(
                Base64ImageView(base64String: base64String, resizable: resizable)
            )
        } else {
            // Fallback
            Logger.viewCycle.error("📀 buildImageView -> fallback")
            imageView = AnyView(
                Image(systemName: "photo")
                    .if(resizable){ view in
                        view.resizable()
                    }
                    .foregroundColor(.gray)
            )
        }
        
        if contentMode != "" {
            imageView = AnyView(imageView.aspectRatio(contentMode: contentMode == "fill" ? .fill : .fit))
        }
        
        if width != 0 || height != 0 {
            imageView = AnyView(imageView.frame(
                width: width == 0 ? nil : width,
                height: height == 0 ? nil: height
            ))
        }
        
        if cornerRadius != 0 {
            imageView = AnyView(imageView.clipShape(Circle().inset(by: CGFloat(-cornerRadius))))
        }
        
        // Aplicar modificadores
        return AnyView(
            imageView
        )
    }
}
