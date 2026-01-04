import { ChangeEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ollama } from "../utils/ollama";
import { Input } from "../components/ui/input";

const ChatPage = () => {
  const [text, setText] = useState("");
  const [input, setInput] = useState("");

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const getResponse = async () => {
    ollama
      .invoke(input, {
        callbacks: [
          {
            handleLLMNewToken: (token: string) => {
              console.log(token);
              setText(text + token);
            },
          },
        ],
      })
      .then((answer: string) => {
        setText(answer);
      });
    setInput("");
  };
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">Chat Page</h1>
      <Input type="text" onChange={onChange} value={input} />
      <button
        onClick={getResponse}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Get Response
      </button>
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
};

export default ChatPage;
