// src/tools/explainNeuralNetwork.ts
// Tool 6 — detect ML/NN code and provide a simple plain-English explanation.

import { AxiosInstance } from "axios";
import { fetchFileContent, fetchRepoTree, parseRepo, TreeFile } from "../utils/github";

export interface NeuralNetworkResult {
  detected: boolean;
  frameworks: string[];
  architectureHints: string[];
  explanation: string;
}

// Framework detection: keyword → friendly name
const FRAMEWORK_KEYWORDS: Record<string, string> = {
  tensorflow: "TensorFlow",
  "tf.": "TensorFlow",
  "import tf": "TensorFlow",
  pytorch: "PyTorch",
  "import torch": "PyTorch",
  "torch.nn": "PyTorch",
  keras: "Keras",
  "from keras": "Keras",
  "tf.keras": "Keras (via TensorFlow)",
  sklearn: "scikit-learn",
  "scikit-learn": "scikit-learn",
  "from sklearn": "scikit-learn",
  jax: "JAX",
  flax: "Flax (JAX)",
  "huggingface": "Hugging Face Transformers",
  "transformers": "Hugging Face Transformers",
  "from transformers": "Hugging Face Transformers",
  mxnet: "Apache MXNet",
  caffe: "Caffe",
  paddle: "PaddlePaddle",
};

// Architecture hints: code pattern → explanation
const ARCH_HINTS: Array<{ pattern: RegExp; label: string; explanation: string }> = [
  { pattern: /Conv2D|conv2d|nn\.Conv/i,         label: "CNN",         explanation: "Convolutional layers suggest image processing or feature extraction (CNN)." },
  { pattern: /LSTM|GRU|RNN|nn\.LSTM/i,          label: "RNN/LSTM",    explanation: "Recurrent layers suggest sequence modeling — text, time series, or speech." },
  { pattern: /Transformer|MultiHeadAttention|attention_mask/i, label: "Transformer", explanation: "Transformer/attention blocks suggest NLP, translation, or generative AI." },
  { pattern: /Embedding\s*\(|nn\.Embedding/i,   label: "Embeddings",  explanation: "Embedding layers suggest NLP or recommendation system work." },
  { pattern: /Dense\s*\(|nn\.Linear|Linear\s*\(/i, label: "Fully-connected", explanation: "Dense/linear layers are the core of standard feedforward networks." },
  { pattern: /GAN|Discriminator|Generator/i,    label: "GAN",         explanation: "GAN pattern detected — likely generative image or data synthesis work." },
  { pattern: /AutoEncoder|autoencoder|Encoder.*Decoder/i, label: "Autoencoder", explanation: "Encoder-decoder pattern — compression, denoising, or generative modeling." },
  { pattern: /reinforcement|ReplayBuffer|DQN|policy_network/i, label: "RL", explanation: "Reinforcement learning pattern — training an agent via reward signals." },
  { pattern: /diffusion|UNet|noise_pred/i,      label: "Diffusion",   explanation: "Diffusion model pattern — likely image generation (like Stable Diffusion)." },
];

const CODE_EXTENSIONS = new Set(["py", "ipynb", "js", "ts", "r", "jl", "cpp", "c"]);

export async function explainNeuralNetwork(
  client: AxiosInstance,
  repo: string
): Promise<NeuralNetworkResult> {
  const { owner, name } = parseRepo(repo);
  const tree = await fetchRepoTree(client, owner, name);

  // Only sample code files, skip very large ones to save API calls
  const codeFiles = tree.filter((f): f is TreeFile => {
    if (f.type !== "blob") return false;
    const dot = f.path.lastIndexOf(".");
    const ext = dot !== -1 ? f.path.slice(dot + 1).toLowerCase() : "";
    return CODE_EXTENSIONS.has(ext) && f.size < 300_000;
  }).slice(0, 30); // cap at 30 files to avoid rate limits

  const detectedFrameworks = new Set<string>();
  const detectedArchHints: Array<{ label: string; explanation: string }> = [];

  for (const file of codeFiles) {
    const content = await fetchFileContent(client, owner, name, file.path);
    if (!content) continue;

    // Framework detection
    for (const [keyword, frameworkName] of Object.entries(FRAMEWORK_KEYWORDS)) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        detectedFrameworks.add(frameworkName);
      }
    }

    // Architecture hints
    for (const hint of ARCH_HINTS) {
      if (
        hint.pattern.test(content) &&
        !detectedArchHints.some((h) => h.label === hint.label)
      ) {
        detectedArchHints.push({ label: hint.label, explanation: hint.explanation });
      }
    }
  }

  const frameworks = [...detectedFrameworks];
  const architectureHints = detectedArchHints.map((h) => h.label);

  if (frameworks.length === 0 && detectedArchHints.length === 0) {
    return {
      detected: false,
      frameworks: [],
      architectureHints: [],
      explanation: "No neural network or ML framework detected in this repository.",
    };
  }

  // Build explanation
  const frameworkText =
    frameworks.length > 0
      ? `Uses ${frameworks.join(", ")}.`
      : "No specific ML framework identified but ML patterns found.";

  const archText =
    detectedArchHints.length > 0
      ? detectedArchHints.map((h) => h.explanation).join(" ")
      : "No specific architecture patterns identified.";

  const explanation =
    `ML/Neural network code detected. ${frameworkText} ${archText}`;

  return {
    detected: true,
    frameworks,
    architectureHints,
    explanation,
  };
}
