// Ridimensiona un'immagine in un riquadro massimo e la converte in PNG (mantiene la trasparenza):
// tiene leggero sia il dato cifrato sia il PDF.
export function fileToImage(file, maxW, maxH) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width, maxH / img.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Immagine non valida. Usa un file PNG, JPG o SVG.'))
    }
    img.src = url
  })
}
export const fileToLogo = (file) => fileToImage(file, 600, 300)
export const fileToStamp = (file) => fileToImage(file, 800, 400)
