"use client"
import React from "react"

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Hataları konsola yazdır
    console.error("React ErrorBoundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <div>Bir hata oluştu.</div>
    }
    return this.props.children
  }
}

export default ErrorBoundary
