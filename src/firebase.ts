// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
	apiKey: 'AIzaSyASNNWN3N0Bi_ZFPkONa5F_ZL9raZgrsUI',
	authDomain: 'euler-studio.firebaseapp.com',
	projectId: 'euler-studio',
	storageBucket: 'euler-studio.appspot.com',
	messagingSenderId: '724877777945',
	appId: '1:724877777945:web:e41ddce78f5404992d9e88',
	measurementId: 'G-XB2J0TEMGJ'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

function getCurrentUser(auth: Auth, user: User | null | undefined): Promise<User | null> {
	return new Promise((resolve, reject) => {
		if (user !== undefined) {
			resolve(user);
		}
		const unsubscribe = auth.onAuthStateChanged((user) => {
			unsubscribe();
			resolve(user);
		}, reject);
	});
}

export default app;
export { getCurrentUser };
