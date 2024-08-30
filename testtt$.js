const geolib = require('geolib');
const { exec } = require('child_process');

// Fonction pour calculer les points intermédiaires en ligne droite
function getIntermediatePoints(start, end, numPoints) {
    const points = [];
    const totalDistance = geolib.getDistance(start, end);
    const bearing = geolib.getRhumbLineBearing(start, end); // Calculer le cap (angle) entre les deux points

    for (let i = 1; i <= numPoints; i++) {
        const fraction = i / (numPoints + 1);
        const distance = totalDistance * fraction;
        const intermediatePoint = geolib.computeDestinationPoint(start, distance, bearing);
        points.push({
            latitude: intermediatePoint.latitude.toFixed(6),
            longitude: intermediatePoint.longitude.toFixed(6)
        });
    }

    return points;
}

// Fonction pour simuler le déplacement
async function simulateMovement(directions) {
    if (!directions || directions.status !== 'OK') {
        console.error('Erreur dans les données de l\'itinéraire.');
        return;
    }

    // Extraire les étapes de l'itinéraire
    const steps = directions.routes[0].legs[0].steps.map(step => ({
        latitude: parseFloat(step.end_location.lat.toFixed(6)),
        longitude: parseFloat(step.end_location.lng.toFixed(6))
    }));

    let index = 0;

    const intervalId = setInterval(() => {
        if (index >= steps.length) {
            clearInterval(intervalId);
            console.log('Déplacement terminé.');
            return;
        }

        const { latitude, longitude } = steps[index];
        console.log(`Déplacement vers: Latitude ${latitude}, Longitude ${longitude}`);
        
        // Commande ADB pour mettre à jour la position
        const command = `adb shell am start-foreground-service --user 0 -n io.appium.settings/.LocationService --es longitude ${longitude} --es latitude ${latitude}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Erreur lors de l'exécution de la commande ADB: ${error}`);
                return;
            }
            console.log(`Commande ADB exécutée avec succès: ${stdout}`);
        });

        index++;
    }, 3000); // Ajustez l'intervalle selon vos besoins
}

// Exemple d'utilisation
const startLocation = { latitude: 48.8566, longitude: 2.3522 }; // Paris, France
const endLocation = { latitude: 48.8586, longitude: 2.2945 }; // Proche de la Tour Eiffel

// Générer les étapes intermédiaires en ligne droite
const steps = getIntermediatePoints(startLocation, endLocation, 30); // 8 points intermédiaires

// Construire l'objet directions pour la simulation
const directions = {
  routes: [
    {
      legs: [
        {
          steps: steps.map(({ latitude, longitude }) => ({
            end_location: { lat: parseFloat(latitude), lng: parseFloat(longitude) }
          }))
        }
      ]
    }
  ],
  status: 'OK'
};

// Simuler le déplacement
simulateMovement(directions);
n