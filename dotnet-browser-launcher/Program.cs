using System.Diagnostics;
using System.Runtime.InteropServices;

namespace BrowserLauncher;

public class Program
{
    public static void Main(string[] args)
    {
        string url = args.Length > 0 ? args[0] : "https://www.google.com";

        Console.WriteLine("=== .NET Browser Launcher ===");
        Console.WriteLine($"Opening URL: {url}");

        try
        {
            OpenBrowser(url);
            Console.WriteLine("Browser launched successfully!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to launch browser: {ex.Message}");
            Environment.Exit(1);
        }
    }

    /// <summary>
    /// Opens the specified URL in the default system browser.
    /// Supports Windows, macOS, and Linux.
    /// </summary>
    public static void OpenBrowser(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            throw new ArgumentException("URL cannot be null or empty.", nameof(url));
        }

        if (!Uri.IsWellFormedUriString(url, UriKind.Absolute))
        {
            throw new ArgumentException($"Invalid URL format: {url}", nameof(url));
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            // On Windows, use cmd /c start to open the default browser
            Process.Start(new ProcessStartInfo
            {
                FileName = "cmd",
                Arguments = $"/c start \"\" \"{url.Replace("&", "^&")}\"",
                CreateNoWindow = true,
                UseShellExecute = false
            });
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            // On macOS, use the 'open' command
            Process.Start(new ProcessStartInfo
            {
                FileName = "open",
                Arguments = url,
                UseShellExecute = false
            });
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            // On Linux, use xdg-open
            Process.Start(new ProcessStartInfo
            {
                FileName = "xdg-open",
                Arguments = url,
                UseShellExecute = false
            });
        }
        else
        {
            throw new PlatformNotSupportedException(
                "Unsupported operating system. Cannot determine how to open the browser.");
        }
    }
}
