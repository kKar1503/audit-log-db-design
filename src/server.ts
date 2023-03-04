import User from './model/User';
import express from 'express';

const app = express();
app.use(express.json());

app.get('/user', (req, res) => {
  User.getAllLatest().then((r) => res.json(r));
});

app.post('/user', (req, res) => {
  // No error handling is done
  User.insert(req.body).then((r) => {
    res.sendStatus(201);
  });
});

app.put('/user/pointer/:uuid/:pos', (req, res) => {
  // No error handling is done
  User.movePointer(req.params.uuid, Number(req.params.pos)).then((r) => {
    res.sendStatus(200);
  });
});

app.get('/user/:uuid', (req, res) => {
  User.getById(req.params.uuid).then((r) => res.json(r));
});

app.put('/user/:uuid', (req, res) => {
  User.update(req.params.uuid, req.body).then((r) => {
    res.json(r);
  });
});

app.delete('/user/:uuid', (req, res) => {
  User.delete(req.params.uuid).then(() => res.sendStatus(204));
});

app.get('/', (req, res) => {
  res.json(`It's working!`);
});

app.listen('3000', () => {
  console.log('Server listening at port 3000');
});
