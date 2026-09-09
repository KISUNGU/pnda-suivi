# Étape 1 : Image Node légère
FROM node:18-alpine

# Étape 2 : Dossier de travail
WORKDIR /app

# Étape 3 : Copier package.json et installer les dépendances
COPY package*.json ./
RUN npm install

# Étape 4 : Copier tout le code source
COPY . .

# Étape 5 : Compiler TypeScript
RUN npm run build

# Étape 6 : Exposer le port du backend
EXPOSE 4000

# Étape 7 : Lancer l'application compilée
CMD ["node", "dist/app.js"]
