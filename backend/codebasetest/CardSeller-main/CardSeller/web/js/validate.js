const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () => {
    container.classList.add('right-panel-active');
});

signInButton.addEventListener('click', () => {
    container.classList.remove('right-panel-active');
});
const passwordInput = document.getElementById('password');
const passwordConfirm = document.getElementById('confirmpassword');
const passwordMessage = document.getElementById('password-message');
const submitButton = document.querySelector('form button');

const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!"#$%&'*+,-\./:;<=>?@\[\]^_`{|}~])[^\s]{8,}$/;

passwordInput.addEventListener('keyup', (event) => {
    const password = event.target.value;
    let isValid = true;
    passwordMessage.textContent = '';

    if (!passwordRegex.test(password)) {
        isValid = false;
        passwordMessage.textContent = 'Mật khẩu phải chứa ít nhất 8 kí tự và ít nhất một kí tự hoa,1 kí tự thường, 1 số, và 1 kí tự đặc biệt.';
    }

    submitButton.disabled = !isValid;
});


passwordConfirm.addEventListener('keyup', (event) => {
    const password = event.target.value;
    let isValid = true;
    passwordMessage.textContent = '';

    if (!(password == passwordInput.value)) {
        isValid = false;
        passwordMessage.textContent = 'Mật khẩu không khớp với mật khẩu bạn đăng kí';
    }

    submitButton.disabled = !isValid;
});


//
document.addEventListener('DOMContentLoaded', function () {
    const nameInput = document.querySelector('input[name="name"]');
    const phoneInput = document.querySelector('input[name="phone"]');
    const nameMessage = document.getElementById('name-message');
    const phoneMessage = document.getElementById('phone-message');
    const submitButton = document.querySelector('form button');

    const nameRegex = /^[A-Za-z\s]+$/;
    const phoneRegex = /^\d{1,10}$/;

    // Validate Name
    function validateName() {
        const nameIsValid = nameRegex.test(nameInput.value);
        nameMessage.textContent = nameIsValid ? '' : 'Tên chỉ được chứa chữ cái và khoảng trắng, không chứa số hoặc ký tự đặc biệt.';
        checkFormValidity();
    }

    // Validate Phone
    function validatePhone() {
        const phoneIsValid = phoneRegex.test(phoneInput.value);
        phoneMessage.textContent = phoneIsValid ? '' : 'Số điện thoại chỉ chứa số và không quá 10 chữ số.';
        checkFormValidity();
    }

    // Check overall form validity
    function checkFormValidity() {
        const nameIsValid = nameRegex.test(nameInput.value);
        const phoneIsValid = phoneRegex.test(phoneInput.value);
        submitButton.disabled = !(nameIsValid && phoneIsValid);
    }

    nameInput.addEventListener('keyup', validateName);
    phoneInput.addEventListener('keyup', validatePhone);
});


document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('form[action="register"]');
    const inputs = form.querySelectorAll('input');
    const select = form.querySelector('select[name="gender"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const formMessage = document.createElement('div');
    formMessage.style.color = 'red';
    formMessage.style.fontSize = '14px';
    formMessage.style.textAlign = 'center';
    formMessage.style.marginTop = '10px';
    formMessage.textContent = 'Vui lòng điền đủ thông tin để đăng ký.';
    formMessage.hidden = true; // Ẩn thông báo này mặc định
    form.appendChild(formMessage);

    function validateInputs() {
        let isValid = true;
        inputs.forEach(input => {
            if (input.value.trim() === '') {
                isValid = false;
            }
        });

        if (select.value === '') {
            isValid = false;
        }

        // Kiểm tra định dạng của các trường như email và password nếu cần
        // Ví dụ, kiểm tra định dạng email
        const emailInput = form.querySelector('input[name="email"]');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value)) {
            isValid = false;
        }

        // Kiểm tra mật khẩu phức tạp
        const passwordInput = form.querySelector('input[name="password"]');
        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!"#$%&'*+,-\./:;<=>?@\[\]^_`{|}~])[^\s]{8,}$/;
        if (!passwordRegex.test(passwordInput.value)) {
            isValid = false;
        }

        submitButton.disabled = !isValid;
        formMessage.hidden = isValid; // Hiển thị thông báo nếu form không hợp lệ
    }

    inputs.forEach(input => input.addEventListener('input', validateInputs));
    select.addEventListener('change', validateInputs);
});