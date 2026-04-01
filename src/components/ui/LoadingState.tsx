import { motion } from "framer-motion";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({
  message = "Opening the library...",
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <motion.div
        className="flex gap-1.5"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.15 } },
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-accent"
            variants={{
              hidden: { opacity: 0.3, y: 0 },
              visible: {
                opacity: [0.3, 1, 0.3],
                y: [0, -8, 0],
                transition: { duration: 1, repeat: Infinity, delay: i * 0.15 },
              },
            }}
          />
        ))}
      </motion.div>
      <p className="font-serif text-sm text-ink-light italic">{message}</p>
    </div>
  );
}
