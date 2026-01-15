import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // Limpiar datos existentes
  await prisma.irrigationEventZone.deleteMany();
  await prisma.irrigationEvent.deleteMany();
  await prisma.irrigationZone.deleteMany();
  await prisma.photoAnalysis.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.cropSensor.deleteMany();
  await prisma.crop.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Datos anteriores eliminados\n');

  // =====================================
  // ZONAS DE RIEGO
  // =====================================
  console.log('💧 Creando zonas de riego...');
  const zonaA = await prisma.irrigationZone.create({
    data: { name: 'Zona A' },
  });
  const zonaB = await prisma.irrigationZone.create({
    data: { name: 'Zona B' },
  });
  console.log(`   - ${zonaA.name}, ${zonaB.name}\n`);

  // =====================================
  // SENSORES
  // =====================================
  console.log('📡 Creando sensores...');
  const sensors = await Promise.all([
    prisma.sensor.create({
      data: {
        name: 'Humedad Suelo - Zona A',
        type: 'humidity_soil',
        unit: '%',
        status: 'normal',
        lastValue: 65,
        lastUpdate: new Date(),
      },
    }),
    prisma.sensor.create({
      data: {
        name: 'Humedad Suelo - Zona B',
        type: 'humidity_soil',
        unit: '%',
        status: 'warning',
        lastValue: 42,
        lastUpdate: new Date(),
      },
    }),
    prisma.sensor.create({
      data: {
        name: 'Temperatura Ambiente',
        type: 'temperature',
        unit: '°C',
        status: 'normal',
        lastValue: 24.5,
        lastUpdate: new Date(),
      },
    }),
    prisma.sensor.create({
      data: {
        name: 'Humedad Aire',
        type: 'humidity_air',
        unit: '%',
        status: 'normal',
        lastValue: 58,
        lastUpdate: new Date(),
      },
    }),
    prisma.sensor.create({
      data: {
        name: 'Luminosidad',
        type: 'light',
        unit: 'lux',
        status: 'normal',
        lastValue: 850,
        lastUpdate: new Date(),
      },
    }),
    prisma.sensor.create({
      data: {
        name: 'pH Suelo - Zona A',
        type: 'ph',
        unit: 'pH',
        status: 'normal',
        lastValue: 6.8,
        lastUpdate: new Date(),
      },
    }),
  ]);

  console.log(`   - ${sensors.length} sensores creados\n`);

  // Generar lecturas históricas para sensores
  console.log('📊 Generando historial de lecturas...');
  const now = Date.now();
  for (const sensor of sensors) {
    const readings = [];
    for (let i = 48; i >= 0; i--) {
      const timestamp = new Date(now - i * 60 * 60 * 1000);
      let value: number;

      switch (sensor.type) {
        case 'humidity_soil':
          value = 55 + Math.sin(i / 4) * 15 + Math.random() * 5;
          break;
        case 'temperature':
          value = 20 + Math.sin((i - 6) / 4) * 8 + Math.random() * 2;
          break;
        case 'humidity_air':
          value = 50 + Math.cos(i / 6) * 15 + Math.random() * 5;
          break;
        case 'light':
          value = (i % 24) >= 6 && (i % 24) <= 20
            ? 400 + Math.sin(((i % 24) - 6) / 4.5) * 500 + Math.random() * 100
            : Math.random() * 50;
          break;
        case 'ph':
          value = 6.5 + Math.random() * 0.6;
          break;
        default:
          value = 50;
      }

      readings.push({
        sensorId: sensor.id,
        value: Math.round(value * 10) / 10,
        timestamp,
      });
    }

    await prisma.sensorReading.createMany({ data: readings });
  }
  console.log(`   - 48 horas de lecturas por sensor\n`);

  // =====================================
  // CULTIVOS
  // =====================================
  console.log('🌿 Creando cultivos...');
  const [sensorHumA, sensorHumB, sensorTemp, sensorAir, sensorLight, sensorPh] = sensors;

  const crops = await Promise.all([
    prisma.crop.create({
      data: {
        name: 'Tomates Cherry',
        variety: 'Sweet Million',
        plantedDate: new Date('2024-11-15'),
        expectedHarvestDate: new Date('2025-02-15'),
        currentStage: 'fruiting',
        healthScore: 92,
        location: 'Zona A - Fila 1',
        imageUrl: '/crops/tomato.jpg',
        sensors: {
          create: [
            { sensorId: sensorHumA.id },
            { sensorId: sensorTemp.id },
            { sensorId: sensorPh.id },
          ],
        },
      },
    }),
    prisma.crop.create({
      data: {
        name: 'Lechugas',
        variety: 'Butterhead',
        plantedDate: new Date('2024-12-20'),
        expectedHarvestDate: new Date('2025-02-01'),
        currentStage: 'vegetative',
        healthScore: 88,
        location: 'Zona A - Fila 2',
        imageUrl: '/crops/lettuce.jpg',
        sensors: {
          create: [
            { sensorId: sensorHumA.id },
            { sensorId: sensorAir.id },
          ],
        },
      },
    }),
    prisma.crop.create({
      data: {
        name: 'Pimientos',
        variety: 'California Wonder',
        plantedDate: new Date('2024-11-01'),
        expectedHarvestDate: new Date('2025-02-20'),
        currentStage: 'flowering',
        healthScore: 75,
        location: 'Zona B - Fila 1',
        imageUrl: '/crops/pepper.jpg',
        sensors: {
          create: [
            { sensorId: sensorHumB.id },
            { sensorId: sensorTemp.id },
          ],
        },
      },
    }),
    prisma.crop.create({
      data: {
        name: 'Albahaca',
        variety: 'Genovese',
        plantedDate: new Date('2024-12-01'),
        expectedHarvestDate: new Date('2025-01-30'),
        currentStage: 'vegetative',
        healthScore: 95,
        location: 'Zona A - Fila 3',
        imageUrl: '/crops/basil.jpg',
        sensors: {
          create: [
            { sensorId: sensorHumA.id },
            { sensorId: sensorLight.id },
          ],
        },
      },
    }),
    prisma.crop.create({
      data: {
        name: 'Zanahorias',
        variety: 'Nantes',
        plantedDate: new Date('2024-10-15'),
        expectedHarvestDate: new Date('2025-01-25'),
        currentStage: 'harvest',
        healthScore: 90,
        location: 'Zona B - Fila 2',
        imageUrl: '/crops/carrot.jpg',
        sensors: {
          create: [
            { sensorId: sensorHumB.id },
            { sensorId: sensorPh.id },
          ],
        },
      },
    }),
    prisma.crop.create({
      data: {
        name: 'Espinacas',
        variety: 'Bloomsdale',
        plantedDate: new Date('2024-12-10'),
        expectedHarvestDate: new Date('2025-02-10'),
        currentStage: 'seedling',
        healthScore: 82,
        location: 'Zona A - Fila 4',
        imageUrl: '/crops/spinach.jpg',
        sensors: {
          create: [
            { sensorId: sensorHumA.id },
            { sensorId: sensorAir.id },
          ],
        },
      },
    }),
  ]);

  console.log(`   - ${crops.length} cultivos creados\n`);

  // =====================================
  // ALERTAS
  // =====================================
  console.log('🚨 Creando alertas...');
  const alerts = await Promise.all([
    prisma.alert.create({
      data: {
        type: 'irrigation',
        severity: 'medium',
        title: 'Humedad baja en Zona B',
        message: 'La humedad del suelo en la Zona B ha descendido al 42%. Se recomienda activar el riego.',
        cropId: crops[2].id, // Pimientos
        isRead: false,
        aiRecommendation: 'Programar riego de 15 minutos en las próximas 2 horas. Considerar aumentar la frecuencia de riego dado el pronóstico de temperaturas altas.',
      },
    }),
    prisma.alert.create({
      data: {
        type: 'pest',
        severity: 'high',
        title: 'Posible presencia de áfidos',
        message: 'El análisis de imagen detectó posibles áfidos en las hojas de los tomates cherry.',
        cropId: crops[0].id, // Tomates
        isRead: false,
        aiRecommendation: 'Inspeccionar manualmente las plantas. Si se confirma, aplicar jabón potásico o aceite de neem. Considerar introducir mariquitas como control biológico.',
      },
    }),
    prisma.alert.create({
      data: {
        type: 'growth',
        severity: 'low',
        title: 'Crecimiento lento detectado',
        message: 'Las espinacas muestran un crecimiento más lento de lo esperado para esta etapa.',
        cropId: crops[5].id, // Espinacas
        isRead: true,
        aiRecommendation: 'Verificar niveles de nitrógeno en el suelo. Considerar aplicar fertilizante orgánico rico en nitrógeno.',
      },
    }),
    prisma.alert.create({
      data: {
        type: 'environmental',
        severity: 'low',
        title: 'Temperatura óptima superada',
        message: 'La temperatura alcanzó 28°C a las 14:00. Las lechugas prefieren temperaturas más frescas.',
        cropId: crops[1].id, // Lechugas
        isRead: true,
        aiRecommendation: 'Considerar instalar malla sombra sobre las lechugas durante las horas pico de sol.',
      },
    }),
    prisma.alert.create({
      data: {
        type: 'nutrition',
        severity: 'medium',
        title: 'Deficiencia de nutrientes detectada',
        message: 'Las hojas de los pimientos muestran signos de clorosis, posible deficiencia de hierro.',
        cropId: crops[2].id, // Pimientos
        isRead: true,
        aiRecommendation: 'Aplicar quelato de hierro al suelo o como fertilizante foliar. Verificar pH del suelo - puede estar demasiado alto impidiendo absorción.',
      },
    }),
  ]);

  console.log(`   - ${alerts.length} alertas creadas\n`);

  // =====================================
  // FOTOS Y ANÁLISIS
  // =====================================
  console.log('📸 Creando fotos con análisis IA...');
  const photos = await Promise.all([
    prisma.photo.create({
      data: {
        url: '/photos/tomato-1.jpg',
        thumbnailUrl: '/photos/thumb-tomato-1.jpg',
        cropId: crops[0].id,
        capturedAt: new Date('2025-01-14T08:00:00Z'),
        analysis: {
          create: {
            healthScore: 85,
            growthStage: 'Fructificación temprana',
            issues: ['Posibles áfidos en hojas inferiores', 'Leve amarillamiento en hojas basales'],
            recommendations: ['Inspeccionar presencia de áfidos', 'Podar hojas basales amarillas', 'Mantener riego constante'],
          },
        },
      },
    }),
    prisma.photo.create({
      data: {
        url: '/photos/lettuce-1.jpg',
        thumbnailUrl: '/photos/thumb-lettuce-1.jpg',
        cropId: crops[1].id,
        capturedAt: new Date('2025-01-14T08:05:00Z'),
        analysis: {
          create: {
            healthScore: 92,
            growthStage: 'Desarrollo de cabeza',
            issues: [],
            recommendations: ['Continuar con régimen actual', 'Cosechar en 2-3 semanas'],
          },
        },
      },
    }),
    prisma.photo.create({
      data: {
        url: '/photos/pepper-1.jpg',
        thumbnailUrl: '/photos/thumb-pepper-1.jpg',
        cropId: crops[2].id,
        capturedAt: new Date('2025-01-14T08:10:00Z'),
        analysis: {
          create: {
            healthScore: 72,
            growthStage: 'Floración',
            issues: ['Clorosis intervenal en hojas medias', 'Estrés hídrico leve'],
            recommendations: ['Aumentar frecuencia de riego', 'Aplicar quelato de hierro', 'Monitorear progreso en 48h'],
          },
        },
      },
    }),
    prisma.photo.create({
      data: {
        url: '/photos/basil-1.jpg',
        thumbnailUrl: '/photos/thumb-basil-1.jpg',
        cropId: crops[3].id,
        capturedAt: new Date('2025-01-13T08:00:00Z'),
        analysis: {
          create: {
            healthScore: 96,
            growthStage: 'Crecimiento vegetativo óptimo',
            issues: [],
            recommendations: ['Podar puntas para promover ramificación', 'Lista para primera cosecha parcial'],
          },
        },
      },
    }),
    prisma.photo.create({
      data: {
        url: '/photos/carrot-1.jpg',
        thumbnailUrl: '/photos/thumb-carrot-1.jpg',
        cropId: crops[4].id,
        capturedAt: new Date('2025-01-13T08:05:00Z'),
        analysis: {
          create: {
            healthScore: 90,
            growthStage: 'Madurez - listas para cosecha',
            issues: [],
            recommendations: ['Cosechar en los próximos 7-10 días', 'El follaje indica raíces de buen tamaño'],
          },
        },
      },
    }),
    prisma.photo.create({
      data: {
        url: '/photos/spinach-1.jpg',
        thumbnailUrl: '/photos/thumb-spinach-1.jpg',
        cropId: crops[5].id,
        capturedAt: new Date('2025-01-13T08:10:00Z'),
        analysis: {
          create: {
            healthScore: 78,
            growthStage: 'Plántula tardía',
            issues: ['Crecimiento más lento de lo esperado'],
            recommendations: ['Verificar nutrientes del suelo', 'Considerar fertilización con nitrógeno'],
          },
        },
      },
    }),
  ]);

  console.log(`   - ${photos.length} fotos con análisis creadas\n`);

  // =====================================
  // EVENTOS DE RIEGO
  // =====================================
  console.log('💧 Creando historial de riego...');
  const irrigationEvents = await Promise.all([
    prisma.irrigationEvent.create({
      data: {
        trigger: 'scheduled',
        duration: 20,
        waterVolume: 45,
        startedAt: new Date('2025-01-14T06:00:00Z'),
        endedAt: new Date('2025-01-14T06:20:00Z'),
        zones: {
          create: [{ zoneId: zonaA.id }],
        },
      },
    }),
    prisma.irrigationEvent.create({
      data: {
        trigger: 'ai_decision',
        duration: 15,
        waterVolume: 30,
        startedAt: new Date('2025-01-14T07:30:00Z'),
        endedAt: new Date('2025-01-14T07:45:00Z'),
        zones: {
          create: [{ zoneId: zonaB.id }],
        },
      },
    }),
    prisma.irrigationEvent.create({
      data: {
        trigger: 'scheduled',
        duration: 25,
        waterVolume: 55,
        startedAt: new Date('2025-01-13T18:00:00Z'),
        endedAt: new Date('2025-01-13T18:25:00Z'),
        zones: {
          create: [
            { zoneId: zonaA.id },
            { zoneId: zonaB.id },
          ],
        },
      },
    }),
    prisma.irrigationEvent.create({
      data: {
        trigger: 'scheduled',
        duration: 20,
        waterVolume: 45,
        startedAt: new Date('2025-01-13T06:00:00Z'),
        endedAt: new Date('2025-01-13T06:20:00Z'),
        zones: {
          create: [{ zoneId: zonaA.id }],
        },
      },
    }),
    prisma.irrigationEvent.create({
      data: {
        trigger: 'manual',
        duration: 10,
        waterVolume: 25,
        startedAt: new Date('2025-01-12T15:00:00Z'),
        endedAt: new Date('2025-01-12T15:10:00Z'),
        zones: {
          create: [{ zoneId: zonaB.id }],
        },
      },
    }),
  ]);

  console.log(`   - ${irrigationEvents.length} eventos de riego creados\n`);

  // =====================================
  // USUARIO ADMIN
  // =====================================
  console.log('👤 Creando usuario admin...');
  await prisma.user.create({
    data: {
      email: 'admin@mallki-sapan.com',
      name: 'Administrador',
      password: 'admin123', // En producción usar hash
      role: 'admin',
    },
  });
  console.log('   - Usuario admin creado\n');

  console.log('✅ Seed completado exitosamente!');
  console.log('─'.repeat(40));
  console.log(`📊 Resumen:`);
  console.log(`   - ${sensors.length} sensores`);
  console.log(`   - ${crops.length} cultivos`);
  console.log(`   - ${alerts.length} alertas`);
  console.log(`   - ${photos.length} fotos`);
  console.log(`   - ${irrigationEvents.length} eventos de riego`);
  console.log(`   - 2 zonas de riego`);
  console.log(`   - 1 usuario admin`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
