import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/env';
import { IUser } from '../models/User';

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

interface RefreshTokenPayload extends TokenPayload {
  tokenId: string;
}

export const generateAccessToken = (user: IUser): string => {
  const payload: TokenPayload = {
    sub: (user._id as string).toString(),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expire,
    issuer: 'infilloai',
  });
};

export const generateRefreshToken = (user: IUser): { token: string; tokenId: string } => {
  const tokenId = crypto.randomBytes(16).toString('hex');
  
  const payload: RefreshTokenPayload = {
    sub: (user._id as string).toString(),
    email: user.email,
    role: user.role,
    tokenId,
  };

  const token = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire,
    issuer: 'infilloai',
  });

  return { token, tokenId };
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.secret, {
    issuer: 'infilloai',
  }) as TokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: 'infilloai',
  }) as RefreshTokenPayload;
};

export const generateTokenPair = (user: IUser) => {
  const accessToken = generateAccessToken(user);
  const { token: refreshToken } = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
  };
}; 