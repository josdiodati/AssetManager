# Guía: Cómo cargar un activo monitoreable en Asset Manager

## Antes de empezar

Para que un activo pueda ser monitoreado, necesitás tener configurado previamente:

1. **Un Monitoreador desplegado** en el sitio del cliente (Raspberry Pi o VM con Zabbix Proxy + WireGuard)
2. **Una Zona de Monitoreo** creada en `/admin/monitoring/zones` vinculada al proxy del monitoreador
3. **El tipo de activo marcado como "Monitoreable"** en `/admin/asset-types`

Si alguno de estos no está configurado, el formulario no va a mostrar la pestaña de Monitoreo o no va a tener opciones disponibles.

---

## Paso 1: Verificar que el tipo de activo sea monitoreable

Andá a **Administración → Tipos de Activo** (`/admin/asset-types`).

Buscá el tipo que vas a usar (por ejemplo "Switch", "Router", "Server", etc.) y verificá que tenga activado el checkbox **"Monitoreable"**.

Si no lo tiene:
1. Editá el tipo de activo
2. Activá el checkbox "Monitoreable"
3. Guardá

**¿Por qué importa?** La pestaña "Monitoreo" en el formulario de activos solo aparece si el tipo de activo seleccionado tiene el flag de monitoreable activado. Si no lo ves, es por esto.

---

## Paso 2: Crear el activo

Andá a **Activos → Agregar** (`/assets/new`).

### Pestaña General

| Campo | Qué poner | Notas |
|---|---|---|
| **Cliente** | Seleccioná el tenant/cliente | ⚠️ Importante: al cambiar el cliente, las opciones de ubicación y monitoreador se actualizan automáticamente |
| **Tipo de activo** | Seleccioná el tipo (ej: "Switch") | Debe ser un tipo marcado como monitoreable |
| **Marca** | Seleccioná la marca (ej: "Ubiquiti") | |
| **Modelo** | Seleccioná el modelo (ej: "USW-Pro-24-PoE") | |
| **Descripción** | Algo que identifique el equipo | Ej: "Switch core rack principal" |
| **Ubicación** | Seleccioná la ubicación del cliente | Se filtra por el cliente seleccionado |

### Pestaña Técnica

| Campo | Qué poner | Notas |
|---|---|---|
| **IP Address** | La IP principal del equipo | Puede ser distinta a la IP de monitoreo |
| **Hostname** | Nombre del equipo en la red | Opcional |
| **Serial Number** | Número de serie | Opcional pero recomendado |

### Pestaña Monitoreo

Esta pestaña **solo aparece si el tipo de activo es monitoreable**. Si no la ves, volvé al Paso 1.

| Campo | Qué poner | Detalle |
|---|---|---|
| **Habilitar monitoreo** | ✅ Activar | Sin esto, el activo se crea pero no se monitorea |
| **Monitoreador (Zona)** | Seleccioná el monitoreador del cliente | Es el Zabbix Proxy desplegado en el sitio del cliente. Se filtra por el cliente seleccionado arriba |
| **Template de monitoreo** | Seleccioná del dropdown | Ej: "UniFi Switch (USW) (SNMP)". Define qué tipo de monitoreo se usa y qué template de Zabbix se asigna |
| **IP objetivo de monitoreo** | ⚠️ **La IP que el monitoreador puede alcanzar** | Ver sección "Sobre la IP de monitoreo" abajo |
| **SNMP Community** | Community string del equipo | Solo aparece si el template seleccionado usa SNMP. Ej: `posnmp`, `public` |

---

## Sobre la IP de monitoreo (dato crítico)

La **IP objetivo de monitoreo** NO es necesariamente la misma IP que cargaste en la pestaña Técnica.

**Debe ser la IP que el monitoreador (Zabbix Proxy) puede alcanzar desde su red local.**

### Ejemplo:
- El switch tiene la IP de management `10.10.20.170` (VLAN 20)
- El monitoreador está en la VLAN 20 con IP `10.10.20.99`
- La IP de monitoreo debe ser `10.10.20.170` ✅

### Otro ejemplo:
- El UDM tiene IP `10.10.20.1` en VLAN 20 y `192.168.1.1` en VLAN 1
- El monitoreador está en VLAN 20, pero puede llegar a `192.168.1.1` porque el UDM es su default gateway
- Podés usar `192.168.1.1` como IP de monitoreo si es alcanzable ✅

### Regla de oro:
> Si desde la terminal del monitoreador podés hacer `ping <IP>` y responde, esa IP sirve como IP de monitoreo.

### Si no estás seguro:
Antes de cargar el activo, verificá la conectividad. Conectate al monitoreador por SSH y probá:
```bash
ping -c 1 <IP_QUE_QUERÉS_MONITOREAR>
```

Si responde → usá esa IP.
Si no responde → el equipo está en una VLAN sin routing al monitoreador, hay que resolver eso primero.

---

## Paso 3: Guardar

Hacé click en **Guardar**.

---

## ¿Qué pasa cuando guardás?

Acá es donde la magia ocurre. Esta es la secuencia completa:

### Instante 1 — Creación del activo (inmediato)
- Se crea el registro del activo en la base de datos de Asset Manager
- Se genera el asset tag automáticamente (ej: `PO-NET-0003`)
- Se guarda la configuración de monitoreo (zona, template, IP, SNMP community)

### Instante 2 — Sincronización con Zabbix (automático, ~1-2 segundos)
Inmediatamente después de guardar, la aplicación ejecuta `syncAssetToZabbix()` en background:

1. **Busca el template de monitoreo** configurado y determina:
   - Qué template de Zabbix asignar (ej: "Ubiquiti AirOS by SNMP")
   - Qué tipo de interfaz crear (SNMP tipo 2, Agent tipo 1, etc.)
   - Qué puerto usar (161 para SNMP, 10050 para Agent)

2. **Busca el proxy** del monitoreador en Zabbix (por el nombre del proxy de la zona)

3. **Crea el host en Zabbix** con:
   - Hostname = asset tag del activo
   - Nombre visible = asset tag + descripción
   - Grupo = grupo del tenant
   - Template = el template de Zabbix correspondiente
   - Proxy = el monitoreador del cliente
   - Interfaz = IP de monitoreo + puerto + tipo (SNMP/Agent)
   - Community SNMP = la que configuraste (si aplica)

4. **Guarda el `zabbixHostId`** en la base de datos y marca el estado como `ACTIVE`

### Si algo falla en la sincronización:
- El estado queda como `ERROR` con el mensaje de error
- Podés ver el error en la vista de monitoreo (`/admin/monitoring`)
- Corregí los datos (IP, community, template) y volvé a guardar el activo — se reintenta automáticamente

### Instante 3 — El proxy recibe la configuración (~30-60 segundos)
El Zabbix Server tiene el nuevo host configurado. En el siguiente ciclo de sincronización:

1. El **Zabbix Proxy** del monitoreador consulta al server: "¿qué hosts tengo asignados?"
2. El server le dice: "ahora también tenés que monitorear `PO-NET-0003` en `192.168.1.170` por SNMP"
3. El proxy recibe la configuración completa (items, triggers, etc.)

### Instante 4 — Primeros datos (~1-2 minutos)
El proxy empieza a pollear el dispositivo:

1. **ICMP ping** — lo primero que se evalúa (cada 60 segundos)
2. **SNMP polling** — consulta los OIDs del template (interfaces, sistema, etc.)
3. Los datos se almacenan localmente en el proxy y se envían al server central a través del túnel WireGuard

### Instante 5 — Visible en Asset Manager (~2-3 minutos total)
Una vez que los datos llegan al Zabbix Server:

1. La tabla de **Monitoreo** (`/admin/monitoring`) muestra el activo con:
   - 🟢 **Healthy** si el equipo responde y no hay problemas
   - 🔴 **Critical** si no responde
   - ⚪ **Unknown** si aún no hay datos suficientes

2. El **detalle de monitoreo** (click en el activo) muestra:
   - Resumen del host
   - Problemas activos
   - Todos los items con valores en tiempo real
   - JSON raw de Zabbix

3. Los **Dashboards de Grafana** (`/admin/monitoring/dashboards`) empiezan a graficar:
   - Ping, latencia, packet loss
   - Tráfico de interfaces
   - Estado operativo

---

## Resumen visual del flujo

```
Guardar activo
    │
    ▼
Asset Manager crea el activo en DB
    │
    ▼ (automático, 1-2 seg)
Asset Manager crea host en Zabbix Server
(template + proxy + IP + SNMP)
    │
    ▼ (30-60 seg)
Zabbix Server sincroniza config al Proxy del monitoreador
    │
    ▼ (30-60 seg)
Proxy empieza a pollear el dispositivo (SNMP/ICMP/Agent)
    │
    ▼ (datos fluyen por WireGuard)
Datos llegan al Zabbix Server central
    │
    ▼
Asset Manager lee datos de Zabbix y muestra:
├── Health semáforo 🟢🟡🔴
├── Problemas activos
├── Items raw
└── Grafana dashboards
```

---

## Checklist rápido

Antes de guardar, verificá:

- [ ] El tipo de activo tiene el flag **Monitoreable** ✅
- [ ] Seleccionaste el **cliente correcto**
- [ ] Seleccionaste el **monitoreador** (zona) del cliente
- [ ] Elegiste el **template de monitoreo** correcto para el tipo de equipo
- [ ] La **IP de monitoreo** es alcanzable desde el monitoreador
- [ ] Si es SNMP, cargaste el **community string** correcto
- [ ] El equipo tiene **SNMP habilitado** (si usás un template SNMP)

---

## Errores comunes

| Problema | Causa probable | Solución |
|---|---|---|
| No veo la pestaña Monitoreo | El tipo de activo no está marcado como monitoreable | Editá el tipo en `/admin/asset-types` y activá "Monitoreable" |
| No hay opciones en el dropdown de monitoreador | No hay zona de monitoreo configurada para ese cliente | Creá una zona en `/admin/monitoring/zones` |
| El activo queda en estado ERROR | Falló la creación del host en Zabbix | Revisá el error en `/admin/monitoring`, corregí y volvé a guardar |
| Health queda en Unknown mucho tiempo | El proxy no puede alcanzar la IP de monitoreo | Verificá conectividad desde el monitoreador: `ping <IP>` |
| SNMP items en "Not supported" | Community string incorrecta o SNMP no habilitado en el equipo | Verificá la config SNMP del dispositivo |
| Health muestra Unknown pero hay datos en el detalle | Para agentes activos, es un tema de cómo se lee availability | Verificá que estés en la última versión del código |
