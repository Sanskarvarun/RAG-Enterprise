import axios from 'axios'

axios.interceptors.response.use(
  res => res,
  err => {
    console.error('API error', err)
    // Simple fallback alert — replace with toast in production
    try {
      const msg = err.response?.data?.detail || err.message || 'API error'
      alert(`Error: ${msg}`)
    } catch (e) {}
    return Promise.reject(err)
  }
)

export default axios
