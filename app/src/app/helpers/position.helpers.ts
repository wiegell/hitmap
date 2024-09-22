export function randomXInWindow() {
  return Math.random() * window.innerWidth * 2 - window.innerWidth / 2;
}

export function randomYInWindow() {
  return Math.random() * window.innerHeight * 2 - window.innerHeight / 2;
}
