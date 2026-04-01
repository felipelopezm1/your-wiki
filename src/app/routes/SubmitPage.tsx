import { Link } from "react-router";
import { motion } from "framer-motion";
import { SubmissionForm } from "@/components/submission/SubmissionForm";

export function SubmitPage() {
  // TODO: Figma alignment point -- layout may change with storyboard
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-ink-light hover:text-ink transition-colors"
      >
        &larr; Back to Library
      </Link>

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-serif text-3xl font-bold text-ink">
          Leave a Message
        </h1>
        <p className="mt-2 text-ink-light">
          Write a message for Ceci. No account needed.
        </p>

        <div className="mt-8 paper-card p-6 sm:p-8">
          <SubmissionForm />
        </div>
      </motion.div>
    </div>
  );
}
