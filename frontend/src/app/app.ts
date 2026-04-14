import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly navItems = [
    { path: '/', label: 'Scaffold Home' },
    { path: '/issues', label: 'Issue Views' },
    { path: '/notes', label: 'Secondary Views' },
  ];
}
