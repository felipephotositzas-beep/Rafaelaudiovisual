FROM nginx:alpine

# Copy the exported web files from the React Native Expo app
# These must be built locally using `npx expo export -p web` before running docker build
COPY dist /usr/share/nginx/html

# Replace default nginx config to support React Router (SPA fallback to index.html)
RUN echo 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
