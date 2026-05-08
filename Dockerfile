# Production image with nginx for lightweight deployment
# Assets are pre-built locally and copied to the container
FROM nginx:1.27-alpine

# Remove default config and add custom one
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static files (Pre-built locally in dist/)
COPY dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
