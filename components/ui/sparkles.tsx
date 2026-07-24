"use client"

import { useEffect, useId, useState } from "react"
import Particles from "@tsparticles/react";
import { tsParticles } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim"

export function SparklesComp({
  className,
  size = 1,
  minSize = null,
  density = 800,
  speed = 1,
  minSpeed = null,
  opacity = 1,
  opacitySpeed = 3,
  minOpacity = null,
  color = "#FFFFFF",
  background = "transparent",
  options = {},
  direction = "bottom",
}: any) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    loadSlim(tsParticles).then(() => setIsReady(true))
  }, [])

  const id = useId()

  const defaultOptions = {
    background: {
      color: {
        value: background,
      },
    },
    fullScreen: {
      enable: false,
      zIndex: 1,
    },
    fpsLimit: 120,
    particles: {
      color: {
        value: color,
      },
      move: {
        enable: true,
        direction: direction as any,
        speed: {
          min: minSpeed || speed / 10,
          max: speed,
        },
        straight: false,
      },
      number: {
        value: density,
      },
      opacity: {
        value: {
          min: minOpacity || opacity / 10,
          max: opacity,
        },
        animation: {
          enable: true,
          sync: false,
          speed: opacitySpeed,
        },
      },
      size: {
        value: {
          min: minSize || size / 2.5,
          max: size,
        },
      },
    },
    detectRetina: true,
  }

  return isReady ? <Particles id={id} options={{ ...defaultOptions, ...options }} className={className} /> : null;
}
