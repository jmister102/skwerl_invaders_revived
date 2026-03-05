import java.applet.Applet;
import java.applet.AppletContext;
import java.applet.AppletStub;
import java.applet.AudioClip;
import java.awt.Dimension;
import java.awt.Image;
import java.io.File;
import java.io.InputStream;
import java.net.URL;
import java.util.Enumeration;
import java.util.Iterator;
import javax.swing.JFrame;

public class GameRunner implements AppletStub, AppletContext {

  private URL codeBase;

  public GameRunner(URL codeBase) {
    this.codeBase = codeBase;
  }

  // AppletStub
  @Override public boolean isActive() { return true; }
  @Override public URL getDocumentBase() { return codeBase; }
  @Override public URL getCodeBase() { return codeBase; }
  @Override public String getParameter(String name) { return ""; }
  @Override public AppletContext getAppletContext() { return this; }
  @Override public void appletResize(int w, int h) {}

  // AudioClip wrapper that makes loop() non-blocking (modern Java blocks on loop()).
  static class NonBlockingClip implements AudioClip {
    private final AudioClip inner;
    private Thread loopThread;
    NonBlockingClip(AudioClip inner) { this.inner = inner; }
    @Override public void play() { inner.play(); }
    @Override public void loop() {
      loopThread = new Thread(inner::loop, "audio-loop");
      loopThread.setDaemon(true);
      loopThread.start();
    }
    @Override public void stop() {
      inner.stop();
      if (loopThread != null) loopThread.interrupt();
    }
  }

  // AppletContext (minimal stubs - high scores / help page won't work standalone)
  @Override public AudioClip getAudioClip(URL url) {
    try { return new NonBlockingClip(Applet.newAudioClip(url)); } catch (Exception e) { return null; }
  }
  @Override public Image getImage(URL url) {
    return java.awt.Toolkit.getDefaultToolkit().getImage(url);
  }
  @Override public Applet getApplet(String name) { return null; }
  @Override public Enumeration<Applet> getApplets() { return null; }
  @Override public void showDocument(URL url) {
    System.out.println("showDocument: " + url);
  }
  @Override public void showDocument(URL url, String target) {
    System.out.println("showDocument: " + url + " [" + target + "]");
  }
  @Override public void showStatus(String status) {
    System.out.println("Status: " + status);
  }
  @Override public void setStream(String key, InputStream stream) {}
  @Override public InputStream getStream(String key) { return null; }
  @Override public Iterator<String> getStreamKeys() { return null; }

  public static void main(String[] args) throws Exception {
    File gameDir = new File(System.getProperty("user.dir"));
    URL codeBase = gameDir.toURI().toURL();

    game applet = new game();
    GameRunner stub = new GameRunner(codeBase);
    applet.setStub(stub);
    applet.setPreferredSize(new Dimension(824, 600));

    JFrame frame = new JFrame("Skwerl Invaders");
    frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
    frame.add(applet);
    frame.pack();
    // Force applet to exactly fill content pane (prevents size=0 timing issue)
    applet.setSize(frame.getContentPane().getSize());
    frame.setLocationRelativeTo(null);
    frame.setVisible(true);

    applet.init();
    applet.start();
  }
}
