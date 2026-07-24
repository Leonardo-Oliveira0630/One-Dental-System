"use client"

import React, { forwardRef } from "react"
import { motion, useInView } from "framer-motion"

export const TimelineContent = forwardRef<any, any>(({ 
    children, 
    className, 
    animationNum, 
    timelineRef, 
    customVariants,
    as = "div" 
}, ref) => {
    const Component = (motion as any)[as] || motion.div;
    const inView = useInView(timelineRef || { current: null }, { once: true, margin: "-100px" });

    return React.createElement(Component as any, { ref, className, custom: animationNum, initial: "hidden", animate: inView ? "visible" : "hidden", variants: customVariants }, children);
})

TimelineContent.displayName = "TimelineContent"
