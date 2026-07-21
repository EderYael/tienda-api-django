import React from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider } from '../context/AuthContext.jsx'
import { ToastProvider } from '../context/ToastContext.jsx'
import { CartProvider } from '../context/CartContext.jsx'
import { Colores } from '../constants/theme.js'

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: { backgroundColor: Colores.blanco },
              headerTintColor: Colores.textoOscuro,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: Colores.fondoApp },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="login"
              options={{ headerShown: true, title: 'Iniciar sesión', presentation: 'modal' }}
            />
            <Stack.Screen
              name="registro"
              options={{ headerShown: true, title: 'Crear cuenta', presentation: 'modal' }}
            />
            <Stack.Screen
              name="producto/[id]"
              options={{ headerShown: true, title: '' }}
            />
            <Stack.Screen
              name="servidor"
              options={{ headerShown: true, title: 'Configuración del servidor', presentation: 'modal' }}
            />
            <Stack.Screen
              name="direcciones"
              options={{ headerShown: true, title: 'Mis direcciones' }}
            />
            <Stack.Screen
              name="pedidos"
              options={{ headerShown: true, title: 'Mis pedidos' }}
            />
            <Stack.Screen
              name="checkout"
              options={{ headerShown: true, title: 'Confirmar pedido', presentation: 'modal' }}
            />
          </Stack>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
