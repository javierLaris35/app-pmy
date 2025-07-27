"use client"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Check, Save, User, Database, FileText, Shield, Users } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { withAuth } from "@/hoc/withAuth";

function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState("general")
  const [saveSuccess, setSaveSuccess] = useState(false)
  const { toast } = useToast()

  const handleSave = () => {
    // Simulación de guardado
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  return (
    <AppLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
            <p className="text-muted-foreground">
              Administra la configuración del sistema y personaliza tu experiencia.
            </p>
          </div>

          {saveSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Guardado exitoso</AlertTitle>
              <AlertDescription className="text-green-700">
                Los cambios han sido guardados correctamente.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-2 md:grid-cols-7 lg:grid-cols-7 gap-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="empresa">Empresa</TabsTrigger>
              <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
              <TabsTrigger value="permisos">Permisos</TabsTrigger>
              <TabsTrigger value="facturacion">Facturación</TabsTrigger>
              <TabsTrigger value="avanzado">Avanzado</TabsTrigger>
              <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración General</CardTitle>
                  <CardDescription>Configura las opciones generales del sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="language">Idioma</Label>
                      <Select defaultValue="es">
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un idioma" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="en">Inglés</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Zona Horaria</Label>
                      <Select defaultValue="america-mexico">
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una zona horaria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="america-mexico">América/Ciudad de México</SelectItem>
                          <SelectItem value="america-tijuana">América/Tijuana</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notifications">Notificaciones</Label>
                        <p className="text-sm text-muted-foreground">
                          Recibe notificaciones sobre actividades importantes.
                        </p>
                      </div>
                      <Switch id="notifications" defaultChecked />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="darkMode">Modo Oscuro</Label>
                        <p className="text-sm text-muted-foreground">
                          Activa el modo oscuro para reducir la fatiga visual.
                        </p>
                      </div>
                      <Switch id="darkMode" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="empresa" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Información de la Empresa</CardTitle>
                  <CardDescription>Actualiza la información de tu empresa.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nombre de la Empresa</Label>
                      <Input id="companyName" defaultValue="Paquetería & Mensajería Del Yaqui" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">RFC</Label>
                      <Input id="taxId" defaultValue="PMY123456ABC" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input id="address" defaultValue="Calle Principal #123, Ciudad Obregón, Sonora" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input id="phone" defaultValue="(644) 123-4567" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input id="email" defaultValue="contacto@delyaqui.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Sitio Web</Label>
                      <Input id="website" defaultValue="www.delyaqui.com" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="usuarios" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle>Gestión de Usuarios</CardTitle>
                      <CardDescription>Administra los usuarios del sistema y sus permisos.</CardDescription>
                    </div>
                    <Link href="/configuracion/usuarios">
                      <Button>
                        <Users className="mr-2 h-4 w-4" />
                        Administrar Usuarios
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <User className="h-4 w-4" />
                      <AlertTitle>Gestión de Usuarios</AlertTitle>
                      <AlertDescription>
                        Desde aquí puedes acceder a la gestión completa de usuarios del sistema, incluyendo la
                        asignación de roles y permisos.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="permisos" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle>Gestión de Permisos</CardTitle>
                      <CardDescription>Administra los roles y permisos del sistema.</CardDescription>
                    </div>
                    <Link href="/configuracion/permisos">
                      <Button>
                        <Shield className="mr-2 h-4 w-4" />
                        Administrar Permisos
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertTitle>Gestión de Permisos</AlertTitle>
                      <AlertDescription>
                        Desde aquí puedes acceder a la gestión completa de roles y permisos del sistema, permitiendo
                        configurar el acceso a las diferentes funcionalidades.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="facturacion" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Facturación</CardTitle>
                  <CardDescription>Configura los parámetros de facturación y métodos de pago.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="invoicePrefix">Prefijo de Factura</Label>
                      <Input id="invoicePrefix" defaultValue="FACT-" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceStartNumber">Número Inicial</Label>
                      <Input id="invoiceStartNumber" type="number" defaultValue="1000" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Métodos de Pago Aceptados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch id="paymentCash" defaultChecked />
                        <Label htmlFor="paymentCash">Efectivo</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="paymentCard" defaultChecked />
                        <Label htmlFor="paymentCard">Tarjeta de Crédito/Débito</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="paymentTransfer" defaultChecked />
                        <Label htmlFor="paymentTransfer">Transferencia Bancaria</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="paymentCheck" />
                        <Label htmlFor="paymentCheck">Cheque</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Configuración de Impuestos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="taxRate">Tasa de IVA (%)</Label>
                        <Input id="taxRate" type="number" defaultValue="16" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxIncluded">Precios con Impuestos Incluidos</Label>
                        <Select defaultValue="included">
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una opción" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="included">Sí, incluir impuestos en precios</SelectItem>
                            <SelectItem value="excluded">No, mostrar impuestos por separado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="avanzado" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración Avanzada</CardTitle>
                  <CardDescription>Opciones avanzadas del sistema. Proceda con precaución.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Advertencia</AlertTitle>
                    <AlertDescription>
                      Cambiar estas configuraciones puede afectar el funcionamiento del sistema. Proceda con precaución.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Base de Datos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="dbBackup">Respaldo Automático</Label>
                        <Select defaultValue="daily">
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una frecuencia" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diario</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensual</SelectItem>
                            <SelectItem value="disabled">Desactivado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dbRetention">Retención de Datos (días)</Label>
                        <Input id="dbRetention" type="number" defaultValue="90" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Mantenimiento</h3>
                    <div className="flex flex-col gap-4">
                      <Button variant="outline">
                        <Database className="mr-2 h-4 w-4" />
                        Limpiar Caché del Sistema
                      </Button>
                      <Button variant="outline">
                        <FileText className="mr-2 h-4 w-4" />
                        Descargar Registros del Sistema
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="seguridad" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Seguridad</CardTitle>
                  <CardDescription>Configura las opciones de seguridad del sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Seguridad</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="twoFactor">Autenticación de Dos Factores</Label>
                          <p className="text-sm text-muted-foreground">
                            Requerir autenticación de dos factores para todos los usuarios.
                          </p>
                        </div>
                        <Switch id="twoFactor" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="sessionTimeout">Tiempo de Inactividad (minutos)</Label>
                          <p className="text-sm text-muted-foreground">
                            Cerrar sesión automáticamente después de inactividad.
                          </p>
                        </div>
                        <Input id="sessionTimeout" type="number" defaultValue="30" className="w-20" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="passwordExpiry">Expiración de Contraseña (días)</Label>
                          <p className="text-sm text-muted-foreground">
                            Forzar cambio de contraseña después de cierto tiempo.
                          </p>
                        </div>
                        <Input id="passwordExpiry" type="number" defaultValue="90" className="w-20" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="passwordComplexity">Complejidad de Contraseña</Label>
                          <p className="text-sm text-muted-foreground">
                            Nivel de complejidad requerido para las contraseñas.
                          </p>
                        </div>
                        <Select defaultValue="medium">
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Selecciona nivel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Registro de Actividad</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="activityLog">Registro de Actividad</Label>
                          <p className="text-sm text-muted-foreground">
                            Mantener un registro de todas las actividades de los usuarios.
                          </p>
                        </div>
                        <Switch id="activityLog" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="logRetention">Retención de Registros (días)</Label>
                          <p className="text-sm text-muted-foreground">
                            Tiempo de retención de los registros de actividad.
                          </p>
                        </div>
                        <Input id="logRetention" type="number" defaultValue="180" className="w-20" />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
    </AppLayout>
  )
}

export default withAuth(ConfiguracionPage, 'configuracion')