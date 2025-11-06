import React, { useState, useRef } from "react";
import axios from "axios";
import "./App.css";
import ChatWidget from "./ChatWidget";

function App() {
  const [stream, setStream] = useState(null);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Start screen sharing
  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      setStream(screenStream);
      if (videoRef.current) {
        videoRef.current.srcObject = screenStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error starting screen share:", err);
      alert("Failed to start screen share. Please allow permissions.");
    }
  };

  // Capture a single frame as base64 image
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  };

  // Handle question submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question || !stream) {
      alert("Please start screen share and enter a question.");
      return;
    }

    const imageBase64 = captureFrame();
    if (!imageBase64) {
      alert("Failed to capture frame from screen.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/analyze_live", {
        image_base64: imageBase64,
        question: question,
      });

      // Parse LLM's structured response (clean ```json formatting)
      let parsedResult;
      try {
        const cleanedText = response.data.result.text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        parsedResult = JSON.parse(cleanedText);
      } catch (err) {
        console.error("Failed to parse JSON:", err);
        parsedResult = { steps: [], highlights: [] };
      }

      setResult(parsedResult);
    } catch (err) {
      console.error(err);
      alert("Error analyzing screen");
    } finally {
      setLoading(false);
    }
  };

  // Draw highlight overlays
  const renderHighlights = () => {
    if (!result || !result.highlights || !videoRef.current) return null;
    const video = videoRef.current;
    const videoRect = video.getBoundingClientRect();

    return result.highlights.map((h, idx) => (
      <div
        key={idx}
        style={{
          position: "absolute",
          border: "2px solid red",
          left: videoRect.left + h.x,
          top: videoRect.top + h.y,
          width: h.w,
          height: h.h,
          pointerEvents: "none",
        }}
        title={h.reason || ""}
      />
    ));
  };

  return (
    <div className="App">
      <h1>🧠 Screen Copilot (Live)</h1>

      {/* Screen share and question input */}
      <div className="controls">
        {!stream ? (
          <button onClick={startScreenShare}>Share Screen</button>
        ) : (
          <p>✅ Screen sharing active</p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: "10px" }}>
          <input
            type="text"
            placeholder="Ask a question about your screen..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Analyzing..." : "Ask"}
          </button>
        </form>
      </div>

      {/* Video preview */}
      <div style={{ position: "relative", marginTop: "20px" }}>
        <video
          ref={videoRef}
          style={{
            maxWidth: "800px",
            border: "2px solid #ccc",
            borderRadius: "8px",
          }}
          autoPlay
          muted
        />
        {renderHighlights()}
      </div>

      {/* Steps */}
      {result && (
        <div className="steps" style={{ marginTop: "20px" }}>
          <h2>🪜 Steps:</h2>
          <ol>
            {result.steps?.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <ChatWidget captureFrame={captureFrame} />

    </div>
  );
}

export default App;
