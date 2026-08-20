import SwiftUI

@available(iOS 16.2, *)
extension JSONLayoutParser {
    struct AsyncImageView: View {
        let urlString: String
        var resizable: Bool = false
        @State private var image: UIImage?
        
        var body: some View {
            Group {
                if let image = image {
                    Image(uiImage: image)
                        .if(resizable){view in
                            view.resizable()
                        }
                } else {
                    ProgressView()
                        .onAppear {
                            loadImage()
                        }
                }
            }
        }
        private func loadImage() {
            guard let url = URL(string: urlString) else { return }
            
            // Verificar cache primeiro
            let cacheKey = urlString.data(using: .utf8)?.base64EncodedString() ?? urlString
            if let cachedImage = ImageCache.shared.getImage(forKey: cacheKey) {
                self.image = cachedImage
                return
            }
            
            // Baixar imagem
            URLSession.shared.dataTask(with: url) { data, _, _ in
                guard let data = data, let uiImage = UIImage(data: data) else { return }
                
                DispatchQueue.main.async {
                    self.image = uiImage
                    ImageCache.shared.setImage(uiImage, forKey: cacheKey)
                }
            }.resume()
        }
    }
    
    struct AppGroupImageView: View {
        let fileName: String
        var resizable: Bool = false
        @State private var image: UIImage?
        
        var body: some View {
            Group {
                if let image = image {
                    Image(uiImage: image)
                        .if(resizable){view in
                            view.resizable()
                        }
                } else {
                    Image(systemName: "photo")
                        .if(resizable){view in
                            view.resizable()
                        }
                        .foregroundColor(.gray)
                        .onAppear {
                            loadImage()
                        }
                }
            }
        }
        
        private func loadImage() {
            guard let containerURL = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: SharedDataManager.shared.appGroupIdentifier
            ) else { return }
            
            let imageURL = containerURL.appendingPathComponent("LiveActivitiesImages").appendingPathComponent(fileName)
            
            if let imageData = try? Data(contentsOf: imageURL),
               let uiImage = UIImage(data: imageData) {
                self.image = uiImage
            }
        }
    }
    
    @available(iOS 16.2, *)
    struct Base64ImageView: View {
        let base64String: String
        var resizable: Bool = false
        @State private var image: UIImage?
        
        var body: some View {
            Group {
                if let image = image {
                    Image(uiImage: image)
                        .if(resizable){view in
                            view.resizable()
                        }
                } else {
                    Image(systemName: "photo")
                        .if(resizable){view in
                            view.resizable()
                        }
                        .foregroundColor(.gray)
                        .onAppear {
                            decodeImage()
                        }
                }
            }
        }
        
        private func decodeImage() {
            // Remover prefixo data:image se existir
            let base64 = base64String.replacingOccurrences(of: "data:image/[^;]+;base64,", with: "", options: .regularExpression)
            
            if let data = Data(base64Encoded: base64),
               let uiImage = UIImage(data: data) {
                self.image = uiImage
            }
        }
    }
}
