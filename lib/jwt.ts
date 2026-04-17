// lib/jwt.ts
export const isTokenExpired = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    const expTime = payload.exp * 1000; // en ms
    const currentTime = Date.now();

    const timeLeftMs = expTime - currentTime;

    const seconds = Math.floor(timeLeftMs / 1000);
    const minutes = Math.floor(seconds / 60);

    const isExpired = expTime < currentTime;

    return isExpired;
  } catch (error) {
    console.log("⚠️ Error leyendo token:", error);
    return true;
  }
};