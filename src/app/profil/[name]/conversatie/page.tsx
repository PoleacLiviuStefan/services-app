"use client";

import { useState } from "react";
import { useSocket } from "web/app/context/SocketProvider" 
import styles from "./page.module.css";

export default function Page() {
  const { sendMessage, messages } = useSocket();
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");

  const handleSend = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && message.trim()) {
      sendMessage({ message, username });
      setMessage("");
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.aurora}>
        <div className={styles.canvasWrapper}>
          <div className={styles.circle0} />
          <div className={styles.circle1} />
          <div className={styles.circle2} />
          <div className={styles.circle3} />
        </div>
      </div>

      {!joined ? (
        <div className={styles.box}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            type="text"
          />
          <button onClick={() => username.trim() && setJoined(true)}>
            Continue
          </button>
        </div>
      ) : (
        <div className={styles.box3}>
          <div className={styles.msgbox}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.msg} ${
                  msg.username === username ? styles.right : ""
                }`}
              >
                <p className={styles.name}>{msg.username}</p>
                <p className={styles.cont}>{msg.message}</p>
              </div>
            ))}
          </div>
          <div className={`${styles.box} ${styles.box2}`}>
            <input
              onKeyDown={handleSend}
              placeholder="Enter message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              type="text"
            />
          </div>
        </div>
      )}
    </main>
  );
}
