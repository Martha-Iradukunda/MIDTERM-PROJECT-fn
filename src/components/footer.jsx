import React from 'react';
import logo from '../images/logo.png';
import Subscribe from './subscribeform';

function Footer() {
  return (
    <footer className="body-footer">
      <h2 className="brand">
        <img alt="logo" src={logo} />
        <span>
          <span className="sec-color">R</span>wamagana Mall
        </span>
      </h2>
      <article>
        <p>Powered by Martha Iradukunda © 2023</p>
        <Subscribe />
      </article>
    </footer>
  );
}

export default Footer;
