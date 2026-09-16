export type JwtPayload = {
  sub: string;
  nombreUsuario: string;
  rolId: number;
};

export type AuthUser = {
  id: string;
  nombreUsuario: string;
  rolId: number;
  jefeId: string | null;
  cuadrillaId: number | null;
  turnoId: number | null;
  requiereFoto: boolean | null;
  requiereUbicacion: boolean | null;
};
