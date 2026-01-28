import express from 'express';
import { signup, login, updateProfile, checkAuth, logout} from "../controllers/userController.js";
import { protectRoute } from '../middlewares/auth.js';

const userRouter = express.Router();

userRouter.post('/signup', signup);
userRouter.post('/login', login);
userRouter.post('/logout', protectRoute, logout);
userRouter.put('/update-profile',protectRoute, updateProfile);
userRouter.get('/check', protectRoute, checkAuth);

export default userRouter;