#!/bin/bash

# Détecte l'IP locale automatiquement
LOCAL_IP=$(hostname -I | awk '{print $1}')

# Met à jour le .env
echo "EXPO_PUBLIC_API_URL=https://suivi-cochon1.onrender.com" > .env
echo "IP mise à jour: $LOCAL_IP"
echo "Fichier .env mis à jour avec: http://$LOCAL_IP:3000"
