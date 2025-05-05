"use client"


import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import saveAs from "file-saver"
import Head from "next/head"


// Define types
type Point = { x: number; y: number }
type DrawingMode = "pen" | "eraser" | "rectangle" | "circle" | "line"
type Layer = {
  id: string
  name: string
  visible: boolean
  canvas: HTMLCanvasElement | null
}


export default function DrawingApp() {
  // State for landing page
  const [showLanding, setShowLanding] = useState(true)


  // Canvas and drawing states
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("pen")
  const [color, setColor] = useState("#000000")
  const [brushSize, setBrushSize] = useState(5)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [layers, setLayers] = useState<Layer[]>([{ id: "layer-1", name: "Layer 1", visible: true, canvas: null }])
  const [activeLayerIndex, setActiveLayerIndex] = useState(0)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showLayersPanel, setShowLayersPanel] = useState(false)
  const [showBrushPanel, setShowBrushPanel] = useState(false)
  const [showShapesPanel, setShowShapesPanel] = useState(false)
  const [shapePreviewImage, setShapePreviewImage] = useState<ImageData | null>(null)


  // Predefined colors
  const predefinedColors = [
    "#000000",
    "#FFFFFF",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#FFA500",
    "#800080",
  ]


  // Initialize canvas and layers
  useEffect(() => {
    if (!showLanding && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")


      // Set canvas size to match container
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
      }


      // Fill with white background
      if (ctx) {
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }


      // Initialize layers with canvases
      setLayers((prevLayers) => {
        return prevLayers.map((layer, index) => {
          if (index === 0 && !layer.canvas) {
            return { ...layer, canvas: canvas }
          }
          return layer
        })
      })


      // Save initial state to history
      saveToHistory()
    }
  }, [showLanding])


  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const container = canvas.parentElement
        if (container) {
          const currentImageData = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height)


          canvas.width = container.clientWidth
          canvas.height = container.clientHeight


          // Restore the image data after resize
          if (currentImageData) {
            canvas.getContext("2d")?.putImageData(currentImageData, 0, 0)
          }
        }
      }
    }


    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])


  // Save current canvas state to history
  const saveToHistory = useCallback(() => {
    if (canvasRef.current) {
      const dataURL = canvasRef.current.toDataURL()


      // If we're not at the end of the history, remove future states
      if (historyIndex < history.length - 1) {
        setHistory((prev) => prev.slice(0, historyIndex + 1))
      }


      setHistory((prev) => [...prev, dataURL])
      setHistoryIndex((prev) => prev + 1)
    }
  }, [history, historyIndex])


  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)


      const img = new Image()
      img.src = history[newIndex]
      img.onload = () => {
        const ctx = canvasRef.current?.getContext("2d")
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          ctx.drawImage(img, 0, 0)
        }
      }
    }
  }, [history, historyIndex])


  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)


      const img = new Image()
      img.src = history[newIndex]
      img.onload = () => {
        const ctx = canvasRef.current?.getContext("2d")
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          ctx.drawImage(img, 0, 0)
        }
      }
    }
  }, [history, historyIndex])


  // Clear canvas function
  const handleClearCanvas = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx && canvasRef.current) {
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      saveToHistory()
    }
  }, [saveToHistory])


  // Add new layer function
  const addLayer = useCallback(() => {
    const newLayerId = `layer-${layers.length + 1}`
    const newLayer: Layer = {
      id: newLayerId,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      canvas: document.createElement("canvas"),
    }


    // Set up the new canvas
    if (newLayer.canvas && canvasRef.current) {
      newLayer.canvas.width = canvasRef.current.width
      newLayer.canvas.height = canvasRef.current.height
      const ctx = newLayer.canvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = "rgba(255, 255, 255, 0)" // Transparent background
        ctx.fillRect(0, 0, newLayer.canvas.width, newLayer.canvas.height)
      }
    }


    setLayers((prev) => [...prev, newLayer])
    setActiveLayerIndex(layers.length)
  }, [layers])


  // Toggle layer visibility
  const toggleLayerVisibility = useCallback((index: number) => {
    setLayers((prev) => prev.map((layer, i) => (i === index ? { ...layer, visible: !layer.visible } : layer)))


    // Redraw canvas
    redrawCanvas()
  }, [])


  // Delete layer
  const deleteLayer = useCallback(
    (index: number) => {
      if (layers.length > 1) {
        setLayers((prev) => prev.filter((_, i) => i !== index))
        if (activeLayerIndex >= index) {
          setActiveLayerIndex((prev) => Math.max(0, prev - 1))
        }


        // Redraw canvas
        redrawCanvas()
      }
    },
    [layers, activeLayerIndex],
  )


  // Redraw canvas with all visible layers
  const redrawCanvas = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)


        // Draw white background
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)


        // Draw each visible layer
        layers.forEach((layer) => {
          if (layer.visible && layer.canvas) {
            ctx.drawImage(layer.canvas, 0, 0)
          }
        })
      }
    }
  }, [layers])


  // Save drawing as image
  const saveAsImage = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          saveAs(blob, "drawing.png")
        }
      })
    }
  }, [])


  // Mouse/Touch event handlers
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    let clientX: number, clientY: number


    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }


    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      }
    }
    return { x: 0, y: 0 }
  }


  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const point = getCoordinates(e)
    setIsDrawing(true)
    setStartPoint(point)


    if (drawingMode === "pen" || drawingMode === "eraser") {
      const ctx = canvasRef.current?.getContext("2d")
      if (ctx) {
        ctx.beginPath()
        ctx.moveTo(point.x, point.y)
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.strokeStyle = drawingMode === "eraser" ? "#FFFFFF" : color
        ctx.lineWidth = brushSize
      }
    } else if (drawingMode === "rectangle" || drawingMode === "circle" || drawingMode === "line") {
      // Save the current canvas state for shape preview
      const ctx = canvasRef.current?.getContext("2d")
      if (ctx && canvasRef.current) {
        setShapePreviewImage(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height))
      }
    }
  }


  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return


    const point = getCoordinates(e)
    const ctx = canvasRef.current?.getContext("2d")


    if (ctx && canvasRef.current) {
      switch (drawingMode) {
        case "pen":
        case "eraser":
          ctx.lineTo(point.x, point.y)
          ctx.stroke()
          break


        case "rectangle":
        case "circle":
        case "line":
          if (startPoint && shapePreviewImage) {
            // Restore the saved image data for preview
            ctx.putImageData(shapePreviewImage, 0, 0)
            ctx.beginPath()
            ctx.strokeStyle = color
            ctx.lineWidth = brushSize
            if (drawingMode === "rectangle") {
              ctx.rect(startPoint.x, startPoint.y, point.x - startPoint.x, point.y - startPoint.y)
              ctx.stroke()
            } else if (drawingMode === "circle") {
              const radius = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2))
              ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI)
              ctx.stroke()
            } else if (drawingMode === "line") {
              ctx.moveTo(startPoint.x, startPoint.y)
              ctx.lineTo(point.x, point.y)
              ctx.stroke()
            }
          }
          break
      }
    }
  }


  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      setShapePreviewImage(null)
      saveToHistory()
    }
  }


  // Add touch event handling
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault() // Prevent scrolling while drawing
    const touch = e.touches[0]
    const point = {
      x: touch.clientX - (canvasRef.current?.getBoundingClientRect().left || 0),
      y: touch.clientY - (canvasRef.current?.getBoundingClientRect().top || 0)
    }
    setIsDrawing(true)
    setStartPoint(point)

    if (drawingMode === "pen" || drawingMode === "eraser") {
      const ctx = canvasRef.current?.getContext("2d")
      if (ctx) {
        ctx.beginPath()
        ctx.moveTo(point.x, point.y)
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.strokeStyle = drawingMode === "eraser" ? "#FFFFFF" : color
        ctx.lineWidth = brushSize
      }
    } else if (drawingMode === "rectangle" || drawingMode === "circle" || drawingMode === "line") {
      const ctx = canvasRef.current?.getContext("2d")
      if (ctx && canvasRef.current) {
        setShapePreviewImage(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height))
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault() // Prevent scrolling while drawing
    if (!isDrawing) return

    const touch = e.touches[0]
    const point = {
      x: touch.clientX - (canvasRef.current?.getBoundingClientRect().left || 0),
      y: touch.clientY - (canvasRef.current?.getBoundingClientRect().top || 0)
    }
    const ctx = canvasRef.current?.getContext("2d")

    if (ctx && canvasRef.current) {
      switch (drawingMode) {
        case "pen":
        case "eraser":
          ctx.lineTo(point.x, point.y)
          ctx.stroke()
          break

        case "rectangle":
        case "circle":
        case "line":
          if (startPoint && shapePreviewImage) {
            ctx.putImageData(shapePreviewImage, 0, 0)
            ctx.beginPath()
            ctx.strokeStyle = color
            ctx.lineWidth = brushSize
            if (drawingMode === "rectangle") {
              ctx.rect(startPoint.x, startPoint.y, point.x - startPoint.x, point.y - startPoint.y)
              ctx.stroke()
            } else if (drawingMode === "circle") {
              const radius = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2))
              ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI)
              ctx.stroke()
            } else if (drawingMode === "line") {
              ctx.moveTo(startPoint.x, startPoint.y)
              ctx.lineTo(point.x, point.y)
              ctx.stroke()
            }
          }
          break
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault() // Prevent scrolling while drawing
    if (isDrawing) {
      setIsDrawing(false)
      setShapePreviewImage(null)
      saveToHistory()
    }
  }

  // Add resize handler for mobile
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const container = canvas.parentElement
        if (container) {
          const currentImageData = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height)
          
          // Set canvas size to match container
          canvas.width = container.clientWidth
          canvas.height = container.clientHeight
          
          // Restore the image data after resize
          if (currentImageData) {
            canvas.getContext("2d")?.putImageData(currentImageData, 0, 0)
          }
        }
      }
    }

    // Initial resize
    handleResize()

    // Add resize listener
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])


  // Render the landing page
  const renderLandingPage = () => (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 to-indigo-100">
      <header className="py-6 px-8 flex justify-between items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center"
        >
          <svg className="w-10 h-10 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h12v12H4V4zm3 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2H8a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <h1 className="ml-2 text-2xl font-bold text-gray-800">Canvas Studio</h1>
        </motion.div>
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden md:flex space-x-8"
        >
          <a href="#features" className="text-gray-600 hover:text-indigo-600 transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-gray-600 hover:text-indigo-600 transition-colors">
            How It Works
          </a>
          <a href="#testimonials" className="text-gray-600 hover:text-indigo-600 transition-colors">
            Testimonials
          </a>
        </motion.nav>
      </header>


      <main className="flex-grow flex flex-col md:flex-row items-center justify-center px-8 py-12">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="md:w-1/2 mb-12 md:mb-0"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
            Unleash Your Creativity with Canvas Studio
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            A powerful digital drawing tool that brings your ideas to life. Create stunning artwork with our intuitive
            interface and professional tools.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLanding(false)}
            className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold shadow-lg hover:bg-indigo-700 transition-colors"
          >
            Start Drawing Now
          </motion.button>
        </motion.div>


        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="md:w-1/2 relative"
        >
          <div className="relative rounded-xl overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1064&q=80"
              alt="Digital Art Canvas"
              className="w-full h-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/50 to-transparent"></div>
          </div>


          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="absolute -bottom-6 -right-6 bg-white p-4 rounded-lg shadow-lg"
          >
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
          </motion.div>
        </motion.div>
      </main>


      <section id="features" className="py-16 px-8 bg-white">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold text-center mb-12"
        >
          Powerful Features
        </motion.h2>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              icon: (
                <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              ),
              title: "Professional Drawing Tools",
              description: "Access a variety of drawing tools including pen, shapes, and eraser with adjustable sizes.",
            },
            {
              icon: (
                <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              ),
              title: "Rich Color Palette",
              description: "Choose from a wide range of colors or create custom colors for your artwork.",
            },
            {
              icon: (
                <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              ),
              title: "Layer Management",
              description: "Organize your artwork with multiple layers for complex compositions and easy editing.",
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gray-50 p-6 rounded-xl shadow-md"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>


      <section id="how-it-works" className="py-16 px-8 bg-gray-50">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold text-center mb-12"
        >
          How It Works
        </motion.h2>


        <div className="max-w-4xl mx-auto">
          {[
            {
              step: "01",
              title: "Choose Your Tools",
              description: "Select from our variety of drawing tools, including pen, shapes, and eraser.",
            },
            {
              step: "02",
              title: "Create Your Masterpiece",
              description: "Use the intuitive canvas to bring your ideas to life with precision and creativity.",
            },
            {
              step: "03",
              title: "Save and Share",
              description: "Download your artwork as an image file to share with friends or use in your projects.",
            },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex items-start mb-12"
            >
              <div className="flex-shrink-0 bg-indigo-600 text-white font-bold text-xl w-12 h-12 rounded-full flex items-center justify-center mr-6">
                {item.step}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>


      <section id="testimonials" className="py-16 px-8 bg-white">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold text-center mb-12"
        >
          What Our Users Say
        </motion.h2>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {[
            {
              quote:
                "Canvas Studio has completely transformed how I create digital art. The intuitive interface and powerful tools make it a joy to use.",
              author: "Sarah Johnson",
              role: "Graphic Designer",
            },
            {
              quote:
                "As an illustrator, I need reliable tools that don't get in the way of creativity. Canvas Studio delivers exactly that and more.",
              author: "Michael Chen",
              role: "Professional Illustrator",
            },
          ].map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gray-50 p-6 rounded-xl shadow-md"
            >
              <svg className="w-10 h-10 text-indigo-400 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-gray-700 mb-4">{testimonial.quote}</p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                  <span className="text-indigo-600 font-semibold">{testimonial.author.charAt(0)}</span>
                </div>
                <div>
                  <h4 className="font-semibold">{testimonial.author}</h4>
                  <p className="text-gray-500 text-sm">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>


      <footer className="bg-gray-900 text-white py-12 px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h12v12H4V4zm3 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2H8a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="ml-2 text-xl font-bold">Canvas Studio</h3>
            </div>
            <p className="text-gray-400">Empowering creativity through digital art.</p>
          </div>


          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">
                  Testimonials
                </a>
              </li>
            </ul>
          </div>


          <div>
            <h4 className="text-lg font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Tutorials
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Community
                </a>
              </li>
            </ul>
          </div>


          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-2">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-indigo-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <a href="mailto:support@canvasstudio.com" className="text-gray-400 hover:text-white transition-colors">
                  support@canvasstudio.com
                </a>
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-indigo-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="text-gray-400">(555) 123-4567</span>
              </li>
            </ul>
          </div>
        </div>


        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Canvas Studio. All rights reserved.</p>
        </div>
      </footer>


      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowLanding(false)}
        className="fixed bottom-8 right-8 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      </motion.button>
    </div>
  )


  // Render the drawing interface
  const renderDrawingInterface = () => (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowLanding(true)}
              className="mr-4 text-gray-600 hover:text-indigo-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </motion.button>
            <h1 className="text-xl font-bold text-gray-800">Canvas Studio</h1>
          </div>

          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={saveAsImage}
              className="flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span className="hidden sm:inline">Save</span>
            </motion.button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-grow flex flex-col md:flex-row">
          {/* Left Sidebar - Tools */}
          <div className="w-full md:w-16 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex md:flex-col items-center py-2 md:py-4">
            <div className="flex md:flex-col space-x-4 md:space-x-0 md:space-y-4 overflow-x-auto md:overflow-x-visible px-2 md:px-0">
              {/* Drawing Tools */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setDrawingMode("pen")}
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${drawingMode === "pen" ? "bg-indigo-100 text-indigo-600" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setDrawingMode("eraser")}
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${drawingMode === "eraser" ? "bg-indigo-100 text-indigo-600" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowShapesPanel(!showShapesPanel)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${drawingMode === "rectangle" || drawingMode === "circle" || drawingMode === "line" ? "bg-indigo-100 text-indigo-600" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </motion.button>

              {/* Shapes Panel */}
              <AnimatePresence>
                {showShapesPanel && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute left-16 top-32 bg-white shadow-lg rounded-lg p-2 z-10"
                  >
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setDrawingMode("rectangle")
                          setShowShapesPanel(false)
                        }}
                        className={`w-full p-2 rounded flex items-center ${drawingMode === "rectangle" ? "bg-indigo-100 text-indigo-600" : "hover:bg-gray-100"}`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                        </svg>
                        Rectangle
                      </button>
                      <button
                        onClick={() => {
                          setDrawingMode("circle")
                          setShowShapesPanel(false)
                        }}
                        className={`w-full p-2 rounded flex items-center ${drawingMode === "circle" ? "bg-indigo-100 text-indigo-600" : "hover:bg-gray-100"}`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="9" strokeWidth="2" />
                        </svg>
                        Circle
                      </button>
                      <button
                        onClick={() => {
                          setDrawingMode("line")
                          setShowShapesPanel(false)
                        }}
                        className={`w-full p-2 rounded flex items-center ${drawingMode === "line" ? "bg-indigo-100 text-indigo-600" : "hover:bg-gray-100"}`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5v14" />
                        </svg>
                        Line
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowBrushPanel(!showBrushPanel)}
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </motion.button>

              {/* Brush Size Panel */}
              <AnimatePresence>
                {showBrushPanel && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute left-16 top-48 bg-white shadow-lg rounded-lg p-4 z-10"
                  >
                    <h3 className="text-sm font-semibold mb-2">Brush Size: {brushSize}px</h3>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number.parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-2">
                      <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center">
                        <div className="bg-black rounded-full" style={{ width: "2px", height: "2px" }}></div>
                      </div>
                      <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center">
                        <div className="bg-black rounded-full" style={{ width: "10px", height: "10px" }}></div>
                      </div>
                      <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center">
                        <div className="bg-black rounded-full" style={{ width: "20px", height: "20px" }}></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* History Controls */}
              <div className="border-t border-gray-200 my-2 md:my-4 w-full md:w-8"></div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${historyIndex <= 0 ? "text-gray-300" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${historyIndex >= history.length - 1 ? "text-gray-300" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClearCanvas}
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </motion.button>

              {/* Color Picker */}
              <div className="border-t border-gray-200 my-2 md:my-4 w-full md:w-8"></div>

              <div className="relative flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  <span className="sr-only">Select Color</span>
                </motion.button>

                <AnimatePresence>
                  {showColorPicker && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="absolute left-16 top-0 bg-white shadow-lg rounded-lg p-4 z-10"
                    >
                      <h3 className="text-sm font-semibold mb-2">Colors</h3>
                      <div className="grid grid-cols-5 gap-2">
                        {predefinedColors.map((c, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setColor(c)
                              setShowColorPicker(false)
                            }}
                            className="w-6 h-6 rounded-full border border-gray-300"
                            style={{ backgroundColor: c }}
                          >
                            <span className="sr-only">Color {c}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-3">
                        <label className="text-xs text-gray-500 block mb-1">Custom Color</label>
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="w-full h-8"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="flex-grow relative bg-gray-50 overflow-hidden">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 cursor-crosshair touch-none select-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>

          {/* Right Sidebar - Layers */}
          <div className="w-full md:w-64 bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-gray-800">Layers</h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addLayer}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </motion.button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-2">
              {layers.map((layer, index) => (
                <motion.div
                  key={layer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`p-2 mb-2 rounded-md border ${activeLayerIndex === index ? "border-indigo-300 bg-indigo-50" : "border-gray-200"}`}
                >
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleLayerVisibility(index)}
                      className="mr-2 text-gray-500 hover:text-gray-700"
                    >
                      {layer.visible ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      )}
                    </button>

                    <div className="flex-grow cursor-pointer" onClick={() => setActiveLayerIndex(index)}>
                      <p className={`text-sm ${activeLayerIndex === index ? "font-medium" : ""}`}>{layer.name}</p>
                    </div>

                    {layers.length > 1 && (
                      <button onClick={() => deleteLayer(index)} className="ml-2 text-gray-500 hover:text-red-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-2">Current Tool</div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: color }}></div>
                <span className="text-sm capitalize">{drawingMode}</span>
                <span className="ml-2 text-xs text-gray-500">{brushSize}px</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )


  return showLanding ? renderLandingPage() : renderDrawingInterface()
}
