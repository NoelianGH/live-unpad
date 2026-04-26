import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'My API',
    description: 'API documentation',
  },
  host: 'localhost:5000',
};

const outputFile = './swagger-output.json';
const routes = ['./src/server.js']; // entry point of your app

swaggerAutogen()(outputFile, routes, doc);