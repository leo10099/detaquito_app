import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Components
import { Button, Container, Content, Header, Image, Separator, TextInput } from '!';
import { TouchListener } from './SignUp.Styles';

// Assets
import Logo from '#/img/logo.png';

// Hooks
import { useFormInput } from '~/hooks';
import { useDispatch, useSelector } from 'react-redux';

// Helpers and Error Messages
import {
	aliasValidation,
	emailValidation,
	passwordValidation,
	passwordsDoNotMatch,
	serverNotResponding,
	buildGoogleProfile,
} from '~/utils';
import { conflictingAlias, conflictingEmail } from '~/store/Auth/Auth.errors';

// Google Auth
import * as Google from 'expo-google-app-auth';

// Auth slice
import Auth from '~/store/Auth/Auth.reducer';

// Selectors
import { selectRegistration, selectGoogleAuthentication } from '~/store/Auth/Auth.selectors';

// Types
import { TextInput as Input, Keyboard } from 'react-native';
import { SignUpScreenNavigationProps } from '~/typings';

interface SignUpProps {
	navigation: SignUpScreenNavigationProps;
}

export const SignUp: React.FC<SignUpProps> = ({ navigation }) => {
	// Refs
	const aliasRef = useRef<Input>(null);
	const passwordRef = useRef<Input>(null);
	const confirmPasswordRef = useRef<Input>(null);

	// Hooks
	const dispatch = useDispatch();

	// Selectors
	const { success: createdUserWithLocalStrategy, error, loading } = useSelector(selectRegistration);
	const {
		success: createdUserWithGoogleStrategy,
		error: googleAuthError,
		loading: googleAuthLoading,
	} = useSelector(selectGoogleAuthentication);

	// Local State
	const {
		inputValue: email,
		setValue: setEmail,
		hasError: emailHasError,
		errorMessage: emailErrorMessage,
		setError: setEmailError,
		validate: validateEmail,
	} = useFormInput('', emailValidation);
	const {
		inputValue: alias,
		setValue: setAlias,
		hasError: aliasHasError,
		errorMessage: aliasErrorMessage,
		setError: setAliasError,
		validate: validateAlias,
	} = useFormInput('', aliasValidation);
	const {
		inputValue: password,
		setValue: setPassword,
		hasError: passwordHasError,
		errorMessage: passwordErrorMessage,
		validate: validatePassword,
	} = useFormInput('', passwordValidation);
	const {
		inputValue: passwordConfirmation,
		setValue: setPasswordConfirmation,
		hasError: passwordConfirmationHasError,
		errorMessage: passwordConfirmationErrorMessage,
		setError: setPasswordError,
		validate: validatePasswordConfirm,
	} = useFormInput('', passwordValidation);
	const [isAliasPopoverOpen, setIsAliasPopoverOpen] = useState(false);
	const [isPasswordPopoverOpen, setIsPasswordPopoverOpen] = useState(false);

	// Helpers
	const shouldDisableSubmitButton = useMemo(() => {
		if (!email || !alias || !password || !passwordConfirmation) {
			return true;
		}
		if (emailHasError || aliasHasError || passwordHasError || passwordConfirmationHasError) {
			return true;
		}
		return false;
	}, [
		alias,
		aliasHasError,
		email,
		emailHasError,
		password,
		passwordConfirmation,
		passwordConfirmationHasError,
		passwordHasError,
	]);

	// Handlers
	const onWrapperClickHandler = (): void => {
		if (isAliasPopoverOpen === true) {
			setIsAliasPopoverOpen(false);
			return;
		}
		if (isPasswordPopoverOpen === true) setIsPasswordPopoverOpen(false);
	};

	const onEmailReady = (): void => {
		const isValid = validateEmail(email);
		if (isValid && aliasRef.current) aliasRef.current.focus();
	};

	const onAliasReady = (): void => {
		const isValid = validateAlias(alias);
		if (isValid && passwordRef.current) passwordRef.current.focus();
	};

	const onPasswordReady = (): void => {
		const isValid = validatePassword(password);
		if (isValid && confirmPasswordRef.current) confirmPasswordRef.current.focus();
	};

	const onConfirmPasswordReady = (): void => {
		const isValid = validatePasswordConfirm(passwordConfirmation);
		if (isValid) Keyboard.dismiss();
		if (password !== passwordConfirmation) {
			setPasswordError(passwordsDoNotMatch.message);
		}
	};

	const formSubmitHandler = useCallback(() => {
		// Perform pre-submit validations
		if (shouldDisableSubmitButton) return false;
		if (password !== passwordConfirmation) {
			setPasswordError(passwordsDoNotMatch.message);
			return false;
		}

		// Put together new user data object
		const newUserData = {
			alias,
			email: email.trim(),
			secret: password,
		};

		dispatch(Auth.actions.registrationRequest(newUserData));
		return true;
	}, [
		alias,
		dispatch,
		email,
		password,
		passwordConfirmation,
		setPasswordError,
		shouldDisableSubmitButton,
	]);

	const signUpWithGoogleHandler = async (): Promise<void> => {
		const logInResult = await Google.logInAsync({
			androidClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
			scopes: ['profile', 'email'],
		});

		if (logInResult.type === 'success') {
			const { user } = logInResult;
			const profile = buildGoogleProfile(user);
			dispatch(Auth.actions.googleAuthenticationRequest(profile));
		}
	};

	// Effects

	// Handle successful registration
	useEffect(() => {
		if (createdUserWithLocalStrategy || createdUserWithGoogleStrategy) {
			navigation.push('Home');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [createdUserWithLocalStrategy, createdUserWithGoogleStrategy]);

	// Handle unsuccessful local strategy registration
	useEffect(() => {
		switch (error?.message) {
			case conflictingEmail.message:
				return setEmailError(conflictingEmail.friendlyMessage);
			case conflictingAlias.message:
				return setAliasError(conflictingAlias.friendlyMessage);
			case serverNotResponding.message:
				return setPasswordError(serverNotResponding.message);
			default:
				return () => {};
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [error]);

	// Handle unsuccessful Google registration
	useEffect(() => {
		// TODO --> Display error notification
		console.log(googleAuthError);
	}, [googleAuthError]);

	return (
		<Container>
			<TouchListener onTouchStart={onWrapperClickHandler}>
				<Content>
					<Image source={Logo} width={120} heigth={80} margin={20} />

					<Header size={1}>Registrate</Header>
					<Header size={3}>para poder jugar</Header>

					<Button
						variant="primary"
						icon="google"
						isBlock={false}
						onPress={signUpWithGoogleHandler}
						marginTop={60}
					>
						Registrate con Google
					</Button>

					<Separator marginTop={60}>O</Separator>

					<TextInput
						autoCompleteType="email"
						elevation={isAliasPopoverOpen ? 0 : 4}
						errorMessage={emailErrorMessage}
						hasError={emailHasError}
						keyboardType="email-address"
						label="Tu Email"
						marginTop={40}
						onBlur={validateEmail}
						onChangeText={setEmail}
						onSubmitEditing={onEmailReady}
						placeholder="usuario@ejemplo.com"
						returnKeyType="next"
					/>
					<TextInput
						autoCompleteType="username"
						elevation={isPasswordPopoverOpen ? 0 : 4}
						errorMessage={aliasErrorMessage}
						hasError={aliasHasError}
						inputRef={aliasRef}
						isPopoverVisible={isAliasPopoverOpen}
						keyboardType="default"
						label="Tu nombre de usuario"
						marginTop={40}
						onBlur={validateAlias}
						onChangeText={setAlias}
						onSubmitEditing={onAliasReady}
						placeholder="Nombre"
						popoverPressHandler={setIsAliasPopoverOpen}
						popoverText="Con este nombre aparecerás en las tablas de posiciones"
						returnKeyType="next"
					/>
					<TextInput
						autoCompleteType="password"
						errorMessage={passwordErrorMessage}
						hasError={passwordConfirmationHasError || passwordHasError}
						inputRef={passwordRef}
						isPopoverVisible={isPasswordPopoverOpen}
						isSecureTextEntry
						keyboardType="default"
						label="Tu contraseña"
						marginTop={40}
						onBlur={validatePassword}
						onChangeText={setPassword}
						onSubmitEditing={onPasswordReady}
						placeholder="Contraseña"
						popoverPressHandler={setIsPasswordPopoverOpen}
						popoverText="La contraseña debe tener al menos 6 caracteres"
					/>
					<TextInput
						autoCompleteType="password"
						errorMessage={passwordConfirmationErrorMessage}
						hasError={passwordConfirmationHasError}
						inputRef={confirmPasswordRef}
						isSecureTextEntry
						keyboardType="default"
						label="Confirma tu contraseña"
						marginTop={40}
						onBlur={onConfirmPasswordReady}
						onChangeText={setPasswordConfirmation}
						onSubmitEditing={onConfirmPasswordReady}
						placeholder="Contraseña"
						returnKeyType="send"
					/>

					<Button
						variant="primary"
						isBlock
						isDisabled={shouldDisableSubmitButton}
						onPress={formSubmitHandler}
						marginTop={40}
						isLoading={loading}
					>
						Continuar
					</Button>
				</Content>
			</TouchListener>
		</Container>
	);
};
