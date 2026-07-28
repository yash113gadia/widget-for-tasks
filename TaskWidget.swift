import Cocoa
import WebKit

// Custom VC that forces the WKWebView to become first responder
// and installs a local event monitor to intercept key events (especially Space)
// before NSPopover can consume them and dismiss itself.
class PopoverWebViewController: NSViewController {
    var webView: WKWebView!
    var keyMonitor: Any?

    override func loadView() {
        let container = NSView(frame: NSRect(x: 0, y: 0, width: 380, height: 580))
        let config = WKWebViewConfiguration()
        webView = WKWebView(frame: container.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.setValue(false, forKey: "drawsBackground")
        container.addSubview(webView)
        self.view = container
    }

    override func viewDidAppear() {
        super.viewDidAppear()
        // Give the WebView first responder so it captures all key events
        view.window?.makeFirstResponder(webView)

        // Install a LOCAL event monitor that intercepts ALL keyDown events
        // inside this app before NSPopover can process them.
        // This prevents Space/Escape/etc from dismissing the popover.
        keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            guard let self = self, let window = self.view.window else { return event }
            // Only intercept if this popover window is key
            if event.window == window {
                // Forward the key event directly to the WebView
                self.webView.keyDown(with: event)
                // Return nil to consume the event so NSPopover never sees it
                return nil
            }
            return event
        }
    }

    override func viewDidDisappear() {
        super.viewDidDisappear()
        if let monitor = keyMonitor {
            NSEvent.removeMonitor(monitor)
            keyMonitor = nil
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate, NSPopoverDelegate {
    var desktopWindow: NSPanel!
    var statusItem: NSStatusItem!
    var popover: NSPopover!
    var desktopWebView: WKWebView!
    var popoverVC: PopoverWebViewController!
    var clickMonitor: Any?

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        // 1. Create Menu Bar Status Item with Popover Dropdown
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            button.title = "Tasks"
            button.action = #selector(togglePopover(_:))
        }

        popover = NSPopover()
        popover.contentSize = NSSize(width: 380, height: 580)
        popover.behavior = .applicationDefined
        popover.delegate = self

        popoverVC = PopoverWebViewController()
        popover.contentViewController = popoverVC

        if let url = URL(string: "http://localhost:3000?widget=true") {
            // Force loadView so webView is initialized
            _ = popoverVC.view
            popoverVC.webView.load(URLRequest(url: url))
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
                closePopover()
            } else {
                popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
                popover.contentViewController?.view.window?.makeKey()

                // Monitor clicks outside the popover to close it
                clickMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] _ in
                    self?.closePopover()
                }
            }
        }
    }

    func closePopover() {
        popover.performClose(nil)
        if let monitor = clickMonitor {
            NSEvent.removeMonitor(monitor)
            clickMonitor = nil
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
