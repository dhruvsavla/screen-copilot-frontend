import React from 'react';
import '../App.css'; 
import '../LandingPage.css'; // This file will hold the new styles

// This is your existing logo file
import logo from '../screen-copilot-extension/icons/Logo.png'; 

function App() {
  const CHROME_STORE_URL = "https://chrome.google.com/webstore/category/extensions"; // Replace with your actual store link

  return (
    <div className="landing-page">
      <header className="header">
        <div className="container">
          <div className="logo">
            <img src={logo} alt="NexAura Logo" />
            <h1>Nex<span className="logo-highlight">A</span>ura</h1>
          </div>
          <nav>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href={CHROME_STORE_URL} className="cta-button secondary">Add to Chrome</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <h2>Never get lost on a website again.</h2>
          <p className="subheader">
            Your personal guide for any webpage. Ask AI for help, or record your
            own step-by-step walkthroughs to automate any task.
          </p>
          <a href={CHROME_STORE_URL} className="cta-button primary">
            Add to Chrome for Free
          </a>
          <div className="hero-image-placeholder">
            [Animated GIF or video showing NexAura in action]
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <h2>One tool, two powerful ways to navigate.</h2>
          <div className="feature-grid">
            
            <div className="feature-card">
              <h3>🤖 AI Assistant</h3>
              <p>
                Stuck on a complex page? Just ask. "How do I update my profile?"
                Our AI will read the page, give you the answer, and highlight the
                exact button you need to click.
              </p>
            </div>

            <div className="feature-card">
              <h3>▶️ Interactive Walkthroughs</h3>
              <p>
                Stop repeating the same tasks. Record any workflow once—like
                filling out a form or uploading a file—and save it. The next time,
                NexAura will guide you through every click.
              </p>
            </div>

          </div>
        </div>
      </section>

      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2>Record once. Play forever.</h2>
          <p className="subheader">
            Create your first guide in under 60 seconds.
          </p>
          <div className="steps-grid">
            
            <div className="step-card">
              <span>1</span>
              <h3>Start Recording</h3>
              <p>
                Click "Create Guide" from the extension icon to enter recording
                mode.
              </p>
            </div>

            <div className="step-card">
              <span>2</span>
              <h3>Click &amp; Comment</h3>
              <p>
                Click any element on the page. A prompt will ask you to add a
                simple instruction, like "Click here to compose a new email."
              </p>
            </div>

            <div className="step-card">
              <span>3</span>
              <h3>Save &amp; Go</h3>
              <p>
                Stop recording, name your guide (e.g., "Compose Email"), and give
                it a shortcut like <code>/compose</code>.
              </p>
            </div>
            
            <div className="step-card">
              <span>4</span>
              <h3>Playback</h3>
              <p>
                The next time you're on that page, just type <code>/compose</code> in
                the chat to get a perfect, step-by-step guided tour.
              </p>
            </div>

          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} NexAura. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;