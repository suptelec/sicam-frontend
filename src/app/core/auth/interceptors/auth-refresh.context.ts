import { HttpContextToken } from '@angular/common/http';

export const TOKEN_REFRESH_RETRY = new HttpContextToken<boolean>(() => false);