import WidgetKit
import SwiftUI
import ActivityKit
import Foundation

@available(iOS 16.2, *)
public struct DynamicActivityWidget: Widget {
    public init() {}
    
    public var body: some WidgetConfiguration {
        ActivityConfiguration(for: DynamicActivityAttributes.self) { context in
            // Regular JSON layout activity
            let layout = context.attributes.layoutJSON
            
            let behavior = JSONLayoutParser.parseJsonCompressedIfNeeded(from: context.attributes.behaviorJSON, as: BehaviorLayoutData.self) ?? BehaviorLayoutData(
                keyLineTint: nil,
                systemActionForegroundColor: nil,
                backgroundTint: nil,
                widgetUrl: nil
            )
                        
            JSONLayoutParser.parseView(
                from: layout,
                with: context.state.data
            )
            .ifLet(behavior.backgroundTint) { view, color in
                view.activityBackgroundTint(Color(hex: color))
            }.ifLet(behavior.systemActionForegroundColor) { view, color in
                view.activitySystemActionForegroundColor(Color(hex: color))
            }.ifLet(behavior.widgetUrl) { view, url in
                view.widgetURL(URL(string: url))
            }
            
        } dynamicIsland: { context in
            let dynamicIslandLayout = context.attributes.dynamicIslandLayoutJSON
            
            let parsedLayout = JSONLayoutParser.parseJsonCompressedIfNeeded(from: dynamicIslandLayout, as: DynamicIslandLayoutData.self) ?? DynamicIslandLayoutData(
                expanded: nil,
                compactLeading: nil,
                compactTrailing: nil,
                minimal: nil
            )
            
            let behavior = JSONLayoutParser.parseJsonCompressedIfNeeded(from: context.attributes.behaviorJSON, as: BehaviorLayoutData.self) ?? BehaviorLayoutData(
                keyLineTint: nil,
                systemActionForegroundColor: nil,
                backgroundTint: nil,
                widgetUrl: nil
            )
            
            // Create Dynamic Island using helper functions
            return DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    DynamicIslandLayoutParser.createExpandedCenter(
                        from: parsedLayout,
                        with: context.state.data
                    )
                }
                DynamicIslandExpandedRegion(.leading) {
                    DynamicIslandLayoutParser.createExpandedLeading(
                        from: parsedLayout,
                        with: context.state.data
                    )
                }
                DynamicIslandExpandedRegion(.trailing) {
                    DynamicIslandLayoutParser.createExpandedTrailing(
                        from: parsedLayout,
                        with: context.state.data
                    )
                }
                DynamicIslandExpandedRegion(.bottom) {
                    DynamicIslandLayoutParser.createExpandedBottom(
                        from: parsedLayout,
                        with: context.state.data
                    )
                }
            } compactLeading: {
                DynamicIslandLayoutParser.createCompactLeading(
                    from: parsedLayout,
                    with: context.state.data
                )
            } compactTrailing: {
                DynamicIslandLayoutParser.createCompactTrailing(
                    from: parsedLayout,
                    with: context.state.data
                )
            } minimal: {
                DynamicIslandLayoutParser.createMinimal(
                    from: parsedLayout,
                    with: context.state.data
                )
            }
            .ifLet(behavior.widgetUrl) { view, url in
                view.widgetURL(URL(string: url))
            }
            .ifLet(behavior.keyLineTint) { view, color in
                view.keylineTint(Color(hex: color))
            }
        }
    }
}

@available(iOS 16.2, *)
public class SharedDataManager {
    public static let shared = SharedDataManager()
    public var appGroupIdentifier: String = ""
    
    private init() {}
    
    public var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupIdentifier)
    }
    
    public func saveLayoutData(_ layout: String, data: [String: Any], for activityId: String) {
        sharedDefaults?.set(layout, forKey: "\(activityId)_layout")
        sharedDefaults?.set(data, forKey: "\(activityId)_data")
    }
    
    public func getLayoutData(for activityId: String) -> (layout: String?, data: [String: Any]?) {
        let layout = sharedDefaults?.string(forKey: "\(activityId)_layout")
        let data = sharedDefaults?.dictionary(forKey: "\(activityId)_data")
        return (layout, data)
    }
}

@available(iOS 16.2, *)
class DynamicIslandLayoutParser {
    @ViewBuilder
    static func createCompactLeading(from layout: DynamicIslandLayoutData, with data: [String: AnyCodable]) -> some View {
        if let element = layout.compactLeading {
            AnyView(JSONLayoutParser.parseView(from: element, with: data))
        }
    }
    
    @ViewBuilder
    static func createCompactTrailing(from layout: DynamicIslandLayoutData, with data: [String: AnyCodable]) -> some View {
        if let element = layout.compactTrailing {
            AnyView(JSONLayoutParser.parseView(from: element, with: data))
        }
    }
    
    @ViewBuilder
    static func createMinimal(from layout: DynamicIslandLayoutData, with data: [String: AnyCodable]) -> some View {
        if let element = layout.minimal {
            AnyView(JSONLayoutParser.parseView(from: element, with: data))
        }
    }
    
    @ViewBuilder
    static func createExpandedBottom(from layout: DynamicIslandLayoutData, with data: [String: AnyCodable]) -> some View {
        if let element = layout.expanded?.bottom {
            JSONLayoutParser.parseView(from: element, with: data)
        }
    }
    
    @ViewBuilder
    static func createExpandedLeading(from layout: DynamicIslandLayoutData, with data: [String: AnyCodable]) -> some View {
        if let element = layout.expanded?.leading {
            JSONLayoutParser.parseView(from: element, with: data)
        }
    }
    
    @ViewBuilder
    static func createExpandedCenter(from layout: DynamicIslandLayoutData, with data: [String: AnyCodable]) -> some View {
        if let element = layout.expanded?.center {
            JSONLayoutParser.parseView(from: element, with: data)
        }
    }
    
    @ViewBuilder
    static func createExpandedTrailing(from layout: DynamicIslandLayoutData, with data: [String: AnyCodable]) -> some View {
        if let element = layout.expanded?.trailing {
            JSONLayoutParser.parseView(from: element, with: data)
        }
    }
}


