const axios = require('axios');
const { exec } = require('child_process');

// Fonction pour calculer la vitesse de marche en fonction de la durée maximale souhaitée (5 minutes)
function calculateWalkingSpeed(distance, maxDuration = 300) {
    const speed = distance / maxDuration;
    return Math.min(Math.max(speed, 0.14), 6.94); // Limiter la vitesse entre 0.14 m/s et 6.94 m/s
}

// Fonction pour obtenir l'itinéraire entre deux points avec une vitesse de marche ajustée
async function getRouteWithWalkingSpeed(start, end, accessToken) {
    const distance = 399.027; // Distance totale du trajet en mètres
    const walkingSpeed = calculateWalkingSpeed(distance); // Calculer la vitesse de marche

    const baseUrl = 'https://api.mapbox.com/directions/v5/mapbox/walking/';
    const params = new URLSearchParams({
        alternatives: 'true',
        geometries: 'geojson',
        overview: 'full',
        steps: 'true',
        access_token: accessToken,
        walking_speed: walkingSpeed // Utiliser la vitesse de marche calculée
    });

    try {
        const response = await axios.get(`${baseUrl}${start};${end}?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching route:', error);
        throw error;
    }
}

// Fonction pour simuler le déplacement en utilisant les points de manœuvre, de géométrie et les intersections
async function simulateMovement(steps) {
    const maxSimulationTime = 300000; // Durée maximale de 5 minutes en millisecondes
    const totalSteps = steps.length;
    const timePerStep = Math.floor(maxSimulationTime / totalSteps); // Temps alloué par étape

    let index = 0;

    const intervalId = setInterval(() => {
        if (index >= steps.length) {
            clearInterval(intervalId);
            console.log('Déplacement terminé.');
            return;
        }

        const step = steps[index];

        // Extraire les coordonnées du point de manœuvre, du dernier point de la géométrie, et des intersections
        const maneuverLocation = step.maneuver.location;
        const geometryLocation = step.geometry.coordinates[step.geometry.coordinates.length - 1];
        const intersections = step.intersections;

        // Parcourir chaque intersection et vérifier les coordonnées
        intersections.forEach((intersection, i) => {
            const intersectionLocation = intersection.location;

            // Comparer les coordonnées pour s'assurer du déplacement correct
            if (maneuverLocation[0] === intersectionLocation[0] && maneuverLocation[1] === intersectionLocation[1]) {
                updateLocation(maneuverLocation[1], maneuverLocation[0]);
            } else if (geometryLocation[0] === intersectionLocation[0] && geometryLocation[1] === intersectionLocation[1]) {
                updateLocation(geometryLocation[1], geometryLocation[0]);
            } else {
                // Si l'intersection est différente, s'y rendre d'abord
                updateLocation(intersectionLocation[1], intersectionLocation[0]);
            }
        });

        // Si le point de manœuvre n'est pas identique au dernier point de géométrie, s'y rendre ensuite
        if (maneuverLocation[0] !== geometryLocation[0] || maneuverLocation[1] !== geometryLocation[1]) {
            updateLocation(maneuverLocation[1], maneuverLocation[0]);
            updateLocation(geometryLocation[1], geometryLocation[0]);
        }

        index++;
    }, timePerStep); // Intervalle ajusté pour limiter la durée totale à 5 minutes
}

// Fonction pour mettre à jour la position avec ADB
function updateLocation(latitude, longitude) {
    console.log(`Déplacement vers: Latitude ${latitude}, Longitude ${longitude}`);
    
    const command = `adb shell am start-foreground-service --user 0 -n io.appium.settings/.LocationService --es longitude ${longitude} --es latitude ${latitude}`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur lors de l'exécution de la commande ADB: ${error}`);
            return;
        }
        console.log(`Commande ADB exécutée avec succès: ${stdout}`);
    });
}


  

// Exemple d'utilisation
const startPoint = '-74.13807,40.767045'; // Point de départ
const endPoint = '-74.290976,40.826347'; // Point d'arrivée
const accessToken = 'pk.eyJ1IjoiZmZzY2giLCJhIjoiY20wN3VyN2tuMDJ4ZzJxc2J1azYzOTg1MSJ9.r20psHXcWEEgeJBx-99OFg';

// Appeler la fonction pour obtenir l'itinéraire et simuler le déplacement
getRouteWithWalkingSpeed(startPoint, endPoint, accessToken)
    .then(routeData => {
        const steps = routeData.routes[0].legs[0].steps;
        simulateMovement(steps);
    })
    .catch(error => {
        console.error('Failed to get route:', error);
    });
