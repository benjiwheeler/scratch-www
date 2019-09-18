const bindAll = require('lodash.bindall');
const classNames = require('classnames');
const React = require('react');
const PropTypes = require('prop-types');
import {Formik} from 'formik';
const {injectIntl, intlShape} = require('react-intl');
const FormattedMessage = require('react-intl').FormattedMessage;

const validate = require('../../lib/validate');
const JoinFlowStep = require('./join-flow-step.jsx');
const FormikInput = require('../../components/formik-forms/formik-input.jsx');
const FormikCheckbox = require('../../components/formik-forms/formik-checkbox.jsx');
const InfoButton = require('../info-button/info-button.jsx');

require('./join-flow-steps.scss');

class EmailStep extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleSetEmailRef',
            'handleValidSubmit',
            'validateEmailIfPresent',
            'validateForm',
            'setCaptchaRef',
            'captchaSolved',
            'onCaptchaLoad',
            'onCaptchaError'
        ]);
        this.state = {
            captchaIsLoading: true
        };
    }

    componentDidMount () {
        // automatically start with focus on username field
        if (this.emailInput) this.emailInput.focus();

        // If grecaptcha doesn't exist on window, we havent loaded the captcha js yet. Load it.
        if (!window.grecaptcha) {
            // ReCaptcha calls a callback when the grecatpcha object is usable. That callback
            // needs to be global so set it on the window.
            window.grecaptchaOnLoad = this.onCaptchaLoad;
            // Load Google ReCaptcha script.
            const script = document.createElement('script');
            script.async = true;
            script.onerror = this.onCaptchaError;
            script.src = `https://www.recaptcha.net/recaptcha/api.js?onload=grecaptchaOnLoad&render=explicit&hl=${window._locale}`;
            document.body.appendChild(script);
        }
    }
    componentWillUnmount () {
        window.grecaptchaOnLoad = null;
    }
    handleSetEmailRef (emailInputRef) {
        this.emailInput = emailInputRef;
    }
    onCaptchaError () {
        // TODO send user to error step once we have one.
    }
    onCaptchaLoad () {
        this.setState({captchaIsLoading: false});
        this.grecaptcha = window.grecaptcha;
        if (!this.grecaptcha) {
            // According to the reCaptcha documentation, this callback shouldn't get
            // called unless window.grecaptcha exists. This is just here to be extra defensive.
            // TODO: Put up the error screen when we have one.
        }
        // TODO: Add in error callback for render once we have an error screen.
        this.widgetId = this.grecaptcha.render(this.captchaRef,
            {
                callback: this.captchaSolved,
                sitekey: process.env.RECAPTCHA_SITE_KEY
            },
            true);
    }
    validateEmailIfPresent (email) {
        if (!email) return null;
        const localResult = validate.validateEmailLocally(email);
        if (!localResult.valid) return this.props.intl.formatMessage({id: localResult.errMsgId});
        return validate.validateEmailRemotely(email).then(
            remoteResult => {
                if (remoteResult.valid === true) {
                    return null;
                }
                return this.props.intl.formatMessage({id: remoteResult.errMsgId});
            }
        );
    }
    validateForm (values) {
        if (!values.email) return {email: this.props.intl.formatMessage({id: 'general.required'})};
        return {};
    }
    handleValidSubmit (formData, formikBag) {
        this.formData = formData;
        this.formikBag = formikBag;
        // Change set submitting to false so that if the user clicks out of
        // the captcha, the button is clickable again (instead of a disabled button with a spinner).
        this.formikBag.setSubmitting(false);
        this.grecaptcha.execute(this.widgetId);
    }
    captchaSolved (token) {
        // Now thatcaptcha is done, we can tell Formik we're submitting.
        this.formikBag.setSubmitting(true);
        this.formData['g-recaptcha-response'] = token;
        this.props.onNextStep(this.formData);
    }
    setCaptchaRef (ref) {
        this.captchaRef = ref;
    }
    render () {
        return (
            <Formik
                initialValues={{
                    email: '',
                    subscribe: false
                }}
                validate={this.validateForm}
                validateOnBlur={false}
                validateOnChange={false}
                onSubmit={this.handleValidSubmit}
            >
                {props => {
                    const {
                        errors,
                        handleSubmit,
                        isSubmitting,
                        setFieldError,
                        setFieldTouched,
                        setFieldValue,
                        validateField
                    } = props;
                    return (
                        <JoinFlowStep
                            footerContent={(
                                <FormattedMessage
                                    id="registration.acceptTermsOfUse"
                                    values={{
                                        touLink: (
                                            <a
                                                className="join-flow-link"
                                                href="/terms_of_use"
                                                target="_blank"
                                            >
                                                <FormattedMessage id="general.termsOfUse" />
                                            </a>
                                        )
                                    }}
                                />
                            )}
                            headerImgSrc="/images/join-flow/email-header.png"
                            innerClassName="join-flow-inner-email-step"
                            nextButton={this.props.intl.formatMessage({id: 'registration.createAccount'})}
                            title={this.props.intl.formatMessage({id: 'registration.emailStepTitle'})}
                            titleClassName="join-flow-email-title"
                            waiting={this.props.waiting || isSubmitting || this.state.captchaIsLoading}
                            onSubmit={handleSubmit}
                        >
                            <FormikInput
                                className={classNames(
                                    'join-flow-input',
                                    'join-flow-input-tall',
                                    {fail: errors.email}
                                )}
                                error={errors.email}
                                id="email"
                                name="email"
                                placeholder={this.props.intl.formatMessage({id: 'general.emailAddress'})}
                                validate={this.validateEmailIfPresent}
                                validationClassName="validation-full-width-input"
                                /* eslint-disable react/jsx-no-bind */
                                onBlur={() => validateField('email')}
                                onChange={e => {
                                    setFieldValue('email', e.target.value);
                                    setFieldTouched('email');
                                    setFieldError('email', null);
                                }}
                                /* eslint-enable react/jsx-no-bind */
                                onSetRef={this.handleSetEmailRef}
                            />
                            <div className="join-flow-privacy-message join-flow-email-privacy">
                                <FormattedMessage id="registration.private" />
                                <InfoButton
                                    message={this.props.intl.formatMessage({id: 'registration.emailStepInfo'})}
                                />
                            </div>
                            <div className="join-flow-email-checkbox-row">
                                <FormikCheckbox
                                    id="subscribeCheckbox"
                                    label={this.props.intl.formatMessage({id: 'registration.receiveEmails'})}
                                    name="subscribe"
                                />
                            </div>
                            <div
                                className="g-recaptcha"
                                data-badge="bottomright"
                                data-sitekey={process.env.RECAPTCHA_SITE_KEY}
                                data-size="invisible"
                                ref={this.setCaptchaRef}
                            />
                        </JoinFlowStep>
                    );
                }}
            </Formik>
        );
    }
}

EmailStep.propTypes = {
    intl: intlShape,
    onNextStep: PropTypes.func,
    waiting: PropTypes.bool
};


module.exports = injectIntl(EmailStep);
