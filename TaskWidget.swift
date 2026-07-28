import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, NSPopoverDelegate {
    var desktopWindow: NSPanel!
    var statusItem: NSStatusItem!
    var popover: NSPopover!
    var desktopWebView: WKWebView!
    var popoverWebView: WKWebView!

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        // 1. Create Menu Bar Status Item with Popover Dropdown
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            button.title = "Tasks"
            button.action = #selector(togglePopover(_:))
        }

        popover = NSPopover()
        popover.contentSize = NSSize(width: 380, height: 580)
        popover.behavior = .transient

        let popoverVC = NSViewController()
        let popoverView = NSView(frame: NSRect(x: 0, y: 0, width: 380, height: 580))
        
        let popoverConfig = WKWebViewConfiguration()
        popoverWebView = WKWebView(frame: popoverView.bounds, configuration: popoverConfig)
        popoverWebView.autoresizingMask = [.width, .height]
        popoverWebView.setValue(false, forKey: "drawsBackground")
        popoverView.addSubview(popoverWebView)
        popoverVC.view = popoverView
        popover.contentViewController = popoverVC

        if let url = URL(string: "http://localhost:3000?widget=true") {
            popoverWebView.load(URLRequest(url: url))
        }

        // 2. Create Floating Desktop Widget Card
        let screenSize = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1400, height: 900)
        let rect = NSRect(x: screenSize.width - 400, y: screenSize.height - 620, width: 380, height: 580)

        desktopWindow = NSPanel(
            contentRect: rect,
            styleMask: [.borderless, .utilityWindow],
            backing: .buffered,
            defer: false
        )

        desktopWindow.level = .normal
        desktopWindow.isOpaque = false
        desktopWindow.backgroundColor = NSColor.clear
        desktopWindow.collectionBehavior = [.canJoinAllSpaces, .stationary]
        desktopWindow.isMovableByWindowBackground = true
        desktopWindow.hasShadow = true

        let desktopConfig = WKWebViewConfiguration()
        desktopWebView = WKWebView(frame: desktopWindow.contentView!.bounds, configuration: desktopConfig)
        desktopWebView.autoresizingMask = [.width, .height]
        desktopWebView.setValue(false, forKey: "drawsBackground")
        desktopWindow.contentView?.addSubview(desktopWebView)

        if let url = URL(string: "http://localhost:3000?widget=true") {
            desktopWebView.load(URLRequest(url: url))
        }

        desktopWindow.makeKeyAndOrderFront(nil)
    }

    @objc func togglePopover(_ sender: AnyObject?) {
        if let button = statusItem.button {
            if popover.isShown {
                popover.performClose(sender)
            } else {
                popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
                popover.contentViewController?.view.window?.makeKey()
            }
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
