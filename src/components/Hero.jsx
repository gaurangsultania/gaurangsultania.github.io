import { motion } from 'framer-motion'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center px-6 max-w-6xl mx-auto">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-3xl"
      >
        <motion.p variants={item} className="text-muted text-sm font-medium tracking-widest uppercase mb-6">
          Product · Strategy · Technology
        </motion.p>

        <motion.h1
          variants={item}
          className="text-5xl sm:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6"
        >
          Gaurang
          <br />
          Sultania
        </motion.h1>

        <motion.p
          variants={item}
          className="text-xl sm:text-2xl text-muted font-medium leading-relaxed max-w-xl mb-10"
        >
          Building at the intersection of product thinking and data — from MBA insights to shipped features.
        </motion.p>

        <motion.div variants={item} className="flex flex-wrap gap-4">
          <a
            href="#projects"
            className="px-6 py-3 bg-white text-bg font-semibold text-sm rounded-sm hover:bg-accent transition-colors"
          >
            View Projects
          </a>
          <a
            href="#contact"
            className="px-6 py-3 border border-border text-white font-semibold text-sm rounded-sm hover:border-white transition-colors"
          >
            Get in Touch
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-muted text-xs tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="w-px h-8 bg-gradient-to-b from-muted to-transparent"
        />
      </motion.div>
    </section>
  )
}
